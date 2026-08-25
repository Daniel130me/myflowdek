import { db } from '@/server/db/client';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AuthError } from '@/server/auth/authorization';
import { sendPasswordResetEmail } from '@/server/email/service';
import {
  PASSWORD_RESET_TOKEN_TTL_HOURS,
  TOKEN_TYPES,
  TOKEN_LENGTH,
  APP_BASE_URL,
} from '@/server/email/constants';
import { BCRYPT_ROUNDS } from '@/lib/auth.constants';
import { passwordSchema } from '@/lib/password-policy';
import { audit } from '@/server/audit/log';

/** Hash a token using SHA-256 for secure storage. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Password reset service.
 *
 * Token lifecycle:
 *   1. User requests reset via POST /api/auth/forgot-password
 *   2. A token is generated + emailed (1-hour TTL)
 *   3. User clicks the link → frontend reset page
 *   4. POST /api/auth/reset-password with token + new password
 *   5. Token verified → password updated, token.usedAt set
 *
 * Security: the forgot-password endpoint always returns 200 (even if the
 * email doesn't exist) to prevent email enumeration.
 */

/** Generate a cryptographically random URL-safe token. */
function generateToken(): string {
  const bytes = Math.ceil(TOKEN_LENGTH / 2);
  return randomBytes(bytes).toString('hex').slice(0, TOKEN_LENGTH);
}

/** Compute the expiry timestamp (now + TTL). */
function expiryDate(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * Request a password reset. If the email exists, generates a token and sends
 * the reset email. If the email doesn't exist, does nothing (but returns
 * success — never reveals whether an email is registered).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, status: true },
  });

  // If the user doesn't exist, silently succeed (prevent enumeration).
  if (!user || user.status !== 'ACTIVE') return;

  // Invalidate any existing unused tokens for this user.
  await db.verificationToken.updateMany({
    where: {
      userId: user.id,
      type: TOKEN_TYPES.PASSWORD_RESET,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  await db.verificationToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      type: TOKEN_TYPES.PASSWORD_RESET,
      expiresAt: expiryDate(),
    },
  });

  await sendPasswordResetEmail(user.email, rawToken, APP_BASE_URL);
}

/**
 * Reset a password using a token. Verifies the token, hashes the new
 * password, updates the user, and marks the token as used — all in a
 * transaction.
 *
 * Throws AuthError if:
 *   - Token not found (404)
 *   - Token already used (409)
 *   - Token expired (410)
 *   - Token type mismatch (400)
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
  // Validate the new password against the policy.
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    throw new AuthError(parsed.error.issues[0]?.message ?? 'Invalid password', 400);
  }

  const tokenHash = hashToken(token);

  const record = await db.verificationToken.findUnique({
    where: { token: tokenHash },
    select: { id: true, userId: true, type: true, usedAt: true, expiresAt: true },
  });

  if (!record) {
    throw new AuthError('Invalid or expired reset link', 404);
  }

  if (record.type !== TOKEN_TYPES.PASSWORD_RESET) {
    throw new AuthError('Invalid token type', 400);
  }

  if (record.usedAt) {
    throw new AuthError('This reset link has already been used', 409);
  }

  if (record.expiresAt < new Date()) {
    throw new AuthError('This reset link has expired', 410);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password + increment sessionVersion (revokes existing sessions)
  // + mark token as used, all in a single transaction.
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    }),
    db.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Audit-log the password reset.
  await audit({
    userId: record.userId,
    action: 'password_reset',
    meta: { method: 'email_token' },
  });

  return { ok: true };
}
