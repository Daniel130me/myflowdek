import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/server/db/client';
import {
  SESSION_STRATEGY,
  LOGIN_PATH,
  DEFAULT_JOB_TITLE_FALLBACK,
  DEFAULT_AVATAR_COLOR,
} from '@/lib/auth.constants';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { audit } from '@/server/audit/log';

/**
 * NextAuth configuration for FlowDeck.
 *
 * Uses the JWT session strategy with a credentials provider that validates
 * email + password against the User table in PostgreSQL (Neon).
 *
 * Login is rate-limited per email (10 attempts/minute) to slow credential
 * brute-force. Every login attempt (success and failure) is audit-logged.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: true,
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: '__Secure-next-auth.callback-url',
      options: {
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: '__Host-next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: '__Secure-next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        maxAge: 900,
      },
    },
    state: {
      name: '__Secure-next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        maxAge: 900,
      },
    },
    nonce: {
      name: '__Secure-next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite: 'none',
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

        // --- Rate limit (per email, 10/min) ---
        const rl = rateLimit(`login:${email}`, RATE_LIMITS.login);
        if (!rl.allowed) {
          return null;
        }

        // Extract IP/user-agent defensively — the req object shape varies
        // between NextAuth versions and runtime environments.
        let ip: string | null = null;
        let userAgent: string | null = null;
        try {
          const headers = (req as { headers?: Headers })?.headers;
          ip = headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? headers?.get('x-real-ip')
            ?? null;
          userAgent = headers?.get('user-agent') ?? null;
        } catch {
          // Headers not available in this runtime — proceed without them.
        }

        try {
          // Auto-provision demo account if requested and not yet created in DB
          if (email === 'wale.johnson@flowdeck.io' && password === 'flowdeck123') {
            const existingDemo = await db.user.findUnique({ where: { email } });
            if (!existingDemo) {
              const demoHash = await bcrypt.hash('flowdeck123', 10);
              const newDemoUser = await db.user.create({
                data: {
                  id: 'u5',
                  email: 'wale.johnson@flowdeck.io',
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
            await audit({ action: 'login_failed', ip, userAgent, meta: { reason: 'unknown_email', email } });
            return null;
          }

          // Block login for deleted/disabled accounts.
          if (user.status !== 'ACTIVE') {
            await audit({ userId: user.id, action: 'login_failed', ip, userAgent, meta: { reason: 'inactive_account', status: user.status } });
            return null;
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            await audit({ userId: user.id, action: 'login_failed', ip, userAgent, meta: { reason: 'wrong_password' } });
            return null;
          }

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
            onboardedAt: true,
            jobTitle: true,
            avatarColor: true,
            status: true,
            sessionVersion: true,
          },
        });
        if (dbUser) {
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
