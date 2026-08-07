import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/server/db/client';

/**
 * NextAuth configuration for FlowDeck.
 *
 * Uses the JWT session strategy with a credentials provider that validates
 * email + password against the User table in PostgreSQL (Neon).
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        try {
          const user = await db.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            role: user.role ?? undefined,
            avatarColor: user.avatarColor ?? undefined,
          };
        } catch (err) {
          console.error('[auth] authorize error:', err);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as AuthUser).id;
        token.role = (user as AuthUser).role;
        token.avatarColor = (user as AuthUser).avatarColor;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as AuthUser).id = token.id as string;
        (session.user as AuthUser).role = token.role as string | undefined;
        (session.user as AuthUser).avatarColor = token.avatarColor as string | undefined;
      }
      return session;
    },
  },
};

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatarColor?: string;
}
