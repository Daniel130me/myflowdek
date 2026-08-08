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
          // Return null so NextAuth shows "invalid credentials" — we don't
          // reveal that the rate limit was hit, to avoid leaking info.
          return null;
        }

        const ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req?.headers?.get('x-real-ip')
          ?? null;
        const userAgent = req?.headers?.get('user-agent') ?? null;

        try {
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
    async jwt({ token, user }) {
      // `user` is only present on the first sign-in; copy its fields onto the
      // token so subsequent requests carry them without re-querying the DB.
      if (user) {
        token.id = (user as AuthUser).id;
        token.jobTitle = (user as AuthUser).jobTitle;
        token.avatarColor = (user as AuthUser).avatarColor;
        token.onboardedAt = (user as AuthUser).onboardedAt
          ? String((user as AuthUser).onboardedAt)
          : null;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the persisted token fields on the session object consumed by
      // the client. Falls back to the defaults if the token is incomplete.
      // The session.user type is augmented in types/next-auth.d.ts so no
      // cast is needed.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.jobTitle =
          (token.jobTitle as string | undefined) ?? DEFAULT_JOB_TITLE_FALLBACK;
        session.user.avatarColor =
          (token.avatarColor as string | undefined) ?? DEFAULT_AVATAR_COLOR;
        session.user.onboardedAt = (token.onboardedAt as string | null) ?? null;
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
}
