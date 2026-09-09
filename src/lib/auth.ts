import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/server/db/client';
import {
  SESSION_STRATEGY,
  LOGIN_PATH,
  DEFAULT_JOB_TITLE_FALLBACK,
  DEFAULT_AVATAR_COLOR,
  DEMO_CREDENTIALS,
  IS_DEMO_ENV,
  BCRYPT_ROUNDS,
} from '@/lib/auth.constants';
import { rateLimit, recordAuthFailure, clearAuthFailures, authBackoffWindowMs, RATE_LIMITS } from '@/lib/rate-limit';
import { audit } from '@/server/audit/log';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Resolve the NextAuth signing secret (Low: auth config hygiene).
 *
 * A production deploy without NEXTAUTH_SECRET must fail at boot with a
 * clear message instead of silently running with `secret: undefined`,
 * which surfaces later as cryptic "JWS verification failures" / "NO SECRET"
 * errors at sign-in time (and, on some NextAuth versions, quietly rotates
 * an ephemeral key, invalidating every session). In dev a fixed string
 * keeps sessions stable across restarts with zero config.
 */
function authSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (isProduction) {
    throw new Error(
      '[auth] NEXTAUTH_SECRET must be set in production — sessions cannot be signed without it.',
    );
  }
  return 'flowdeck-dev-secret-do-not-use-in-production';
}

/**
 * NextAuth configuration for FlowDeck.
 *
 * Uses the JWT session strategy with a credentials provider that validates
 * email + password against the User table in PostgreSQL (Neon).
 *
 * Login is rate-limited on two axes (audit Table 7.1): per-IP for all
 * attempts and per-email for FAILED attempts with a widening backoff
 * window. Counting only failures per email means an attacker burning a
 * victim's bucket simultaneously burns their own IP budget, and a
 * successful sign-in clears the streak entirely. Every login attempt
 * (success and failure) is audit-logged.
 */
export const authOptions: NextAuthOptions = {
  secret: authSecret(),
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        // Same-site SPA: 'lax' restores the implicit CSRF defence that
        // cookie-authenticated custom API routes relied on (audit H-17 —
        // SameSite=None removed it with no compensating CSRF tokens).
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        // --- Rate limits (audit Table 7.1) ---
        // Per-IP: every attempt counts, so credential-stuffing sweeps burn
        // the attacker's own budget before they can fill a victim's email
        // bucket. Behind the platform proxy TRUST_PROXY=true makes this the
        // real client IP; otherwise every caller shares one 'unknown' bucket
        // (spoofed XFF must not buy a fresh bucket).
        let ip: string | null = null;
        let userAgent: string | null = null;
        try {
          const headers = (req as { headers?: Headers })?.headers;
          ip = process.env.TRUST_PROXY === 'true'
            ? headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
            : null;
          ip = ip ?? headers?.get('x-real-ip') ?? 'unknown';
          userAgent = headers?.get('user-agent') ?? null;
        } catch {
          // Headers not available in this runtime — proceed without them.
        }
        const ipRl = rateLimit(`login-ip:${ip}`, RATE_LIMITS.loginIp);
        if (!ipRl.allowed) {
          await audit({ action: 'login_rate_limited', ip, userAgent, meta: { axis: 'ip', email } });
          return null;
        }

        // Per-email: FAILED attempts only, in a window that doubles for
        // every 5 consecutive failures (cap 16x) — intentional lockout DoS
        // of an email now costs the attacker their full IP budget while a
        // user who types the right password is never throttled.
        const emailRl = rateLimit(
          `login-email:${email}`,
          { ...RATE_LIMITS.login, windowMs: authBackoffWindowMs(email, RATE_LIMITS.login.windowMs) },
        );
        if (!emailRl.allowed) {
          await audit({ action: 'login_rate_limited', ip, userAgent, meta: { axis: 'email', email } });
          return null;
        }

        try {
          // Auto-provision demo account if requested and not yet created in
          // DB. NEVER available in production — this is a convenience for
          // local/dev demos, not a public signup path (audit H-18: the
          // credentials ship in the client bundle, so an ungated path here is
          // a permanent backdoor). The button is hidden in prod too. Gated
          // through the shared IS_DEMO_ENV switch + DEMO_CREDENTIALS so the
          // policy and the credentials can never drift from the seed script
          // or the UI (Low: demo-credentials gating).
          if (
            IS_DEMO_ENV &&
            email === DEMO_CREDENTIALS.email &&
            password === DEMO_CREDENTIALS.password
          ) {
            const existingDemo = await db.user.findUnique({ where: { email } });
            if (!existingDemo) {
              const demoHash = await bcrypt.hash(DEMO_CREDENTIALS.password, BCRYPT_ROUNDS);
              const newDemoUser = await db.user.create({
                data: {
                  id: 'u5',
                  email: DEMO_CREDENTIALS.email,
                  name: 'Wale Johnson',
                  jobTitle: 'Project Manager',
                  avatarColor: '#FE8029',
                  passwordHash: demoHash,
                  onboardedAt: new Date(),
                  status: 'ACTIVE',
                },
              });
              const existingWs = await db.workspace.findFirst({ where: { slug: 'flowdeck-demo' } });
              if (!existingWs) {
                await db.workspace.create({
                  data: {
                    id: 'ws1',
                    name: 'Flowdeck Demo',
                    slug: 'flowdeck-demo',
                    members: {
                      create: {
                        userId: newDemoUser.id,
                        role: 'OWNER',
                      },
                    },
                  },
                });
              } else {
                await db.workspaceMember.upsert({
                  where: { workspaceId_userId: { workspaceId: existingWs.id, userId: newDemoUser.id } },
                  create: { workspaceId: existingWs.id, userId: newDemoUser.id, role: 'OWNER' },
                  update: {},
                });
              }
            }
          }

          // Single keyed lookup — no scan, no N+1.
          const user = await db.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) {
            recordAuthFailure(email, RATE_LIMITS.login.windowMs);
            await audit({ action: 'login_failed', ip, userAgent, meta: { reason: 'unknown_email', email } });
            return null;
          }

          // Block login for deleted/disabled accounts.
          if (user.status !== 'ACTIVE') {
            await audit({ userId: user.id, action: 'login_failed', ip, userAgent, meta: { reason: 'inactive_account', status: user.status } });
            return null;
          }

          // Email verification enforcement (audit H-19). The subsystem was
          // fully built (hashed single-use tokens, 24h TTL) but login never
          // checked it, making it dead weight. Opt-in via env so the cutover
          // is a deliberate launch decision — existing accounts with null
          // emailVerifiedAt are not locked out by surprise.
          if (
            process.env.REQUIRE_EMAIL_VERIFICATION === 'true' &&
            !user.emailVerifiedAt
          ) {
            await audit({ userId: user.id, action: 'login_failed', ip, userAgent, meta: { reason: 'email_unverified' } });
            // NextAuth surfaces this message to signIn({redirect:false}),
            // which the login page maps to a verify notice + resend path.
            throw new Error('EMAIL_NOT_VERIFIED');
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            recordAuthFailure(email, RATE_LIMITS.login.windowMs);
            await audit({ userId: user.id, action: 'login_failed', ip, userAgent, meta: { reason: 'wrong_password' } });
            return null;
          }

          clearAuthFailures(email);
          await audit({ userId: user.id, action: 'login', ip, userAgent });
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            jobTitle: user.jobTitle ?? undefined,
            avatarColor: user.avatarColor ?? undefined,
            onboardedAt: user.onboardedAt ?? undefined,
            sessionVersion: user.sessionVersion,
          };
        } catch (err) {
          // Verification gate must reach the client — don't let the generic
          // handler flatten it into "invalid credentials".
          if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') throw err;
          console.error('[auth] authorize error:', err);
          await audit({ action: 'login_failed', ip, userAgent, meta: { reason: 'internal_error', email } });
          return null;
        }
      },
    }),
  ],
  session: { strategy: SESSION_STRATEGY },
  pages: { signIn: LOGIN_PATH },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return url;
      try {
        const urlObj = new URL(url);
        const baseObj = new URL(baseUrl);
        if (urlObj.origin === baseObj.origin || urlObj.hostname.endsWith('run.app') || urlObj.hostname === 'localhost') {
          return url;
        }
      } catch {
        // invalid URL
      }
      return baseUrl;
    },
    async jwt({ token, user, trigger }) {
      // `user` is only present on the first sign-in; copy its fields onto the
      // token so subsequent requests carry them without re-querying the DB.
      if (user) {
        token.id = (user as AuthUser).id;
        token.jobTitle = (user as AuthUser).jobTitle;
        token.avatarColor = (user as AuthUser).avatarColor;
        token.onboardedAt = (user as AuthUser).onboardedAt
          ? String((user as AuthUser).onboardedAt)
          : null;
        token.sessionVersion = (user as AuthUser).sessionVersion ?? 0;
      }

      // Handle session update: when the client calls useSession().update(),
      // refresh the user's state from the DB so changes (onboarding, profile
      // edits, password reset) are reflected without a full logout/login.
      if (trigger === 'update' && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            name: true,
            onboardedAt: true,
            jobTitle: true,
            avatarColor: true,
            status: true,
            sessionVersion: true,
          },
        });
        if (dbUser) {
          if (dbUser.name) token.name = dbUser.name;
          token.onboardedAt = dbUser.onboardedAt
            ? String(dbUser.onboardedAt)
            : null;
          token.jobTitle = dbUser.jobTitle ?? undefined;
          token.avatarColor = dbUser.avatarColor ?? undefined;
          token.sessionVersion = dbUser.sessionVersion;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Expose the persisted token fields on the session object consumed by
      // the client. Falls back to the defaults if the token is incomplete.
      if (session.user) {
        session.user.id = token.id as string;
        if (token.name) session.user.name = token.name as string;
        session.user.jobTitle =
          (token.jobTitle as string | undefined) ?? DEFAULT_JOB_TITLE_FALLBACK;
        session.user.avatarColor =
          (token.avatarColor as string | undefined) ?? DEFAULT_AVATAR_COLOR;
        session.user.onboardedAt = (token.onboardedAt as string | null) ?? null;
        (session.user as { sessionVersion?: number }).sessionVersion =
          (token.sessionVersion as number | undefined) ?? 0;
      }
      return session;
    },
  },
  events: {
    // Audit-log sign-out events.
    async signOut({ token }) {
      await audit({ userId: (token as { id?: string })?.id, action: 'logout' });
    },
  },
};

/** Shape of the user object enriched onto the NextAuth session/JWT. */
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  jobTitle?: string;
  avatarColor?: string;
  onboardedAt?: Date | null;
  sessionVersion?: number;
}
