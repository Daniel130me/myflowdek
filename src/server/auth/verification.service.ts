import { db } from '@/server/db/client';
import { randomBytes } from 'node:crypto';
import { AuthError } from '@/server/auth/authorization';
import {
  sendVerificationEmail,
} from '@/server/email/service';
import {
  VERIFICATION_TOKEN_TTL_HOURS,
  TOKEN_TYPES,
  TOKEN_LENGTH,
  APP_BASE_URL,
} from '@/server/email/constants';

/**
 * Email verification service.
 *
 * Generates tokens, sends verification emails, and verifies tokens to mark
 * the user's email as verified.
 *
 * Token lifecycle:
 *   1. Generated on registration (or on resend request)
 *   2. Emailed to the user as a link
 *   3. User clicks the link → POST /api/auth/verify-email
 *   4. Token verified → User.emailVerifiedAt set, token.usedAt set
 *   5. Token expires after VERIFICATION_TOKEN_TTL_HOURS (24h)
 */

/** Generate a cryptographically random URL-safe token. */
function generateToken(): string {
  const bytes = Math.ceil(TOKEN_LENGTH / 2);
  return randomBytes(bytes).toString('hex').slice(0, TOKEN_LENGTH);
}

/** Compute the expiry timestamp (now + TTL). */
function expiryDate(): Date {
  return new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * Generate a verification token for a user and send the verification email.
 *
 * Invalidates any existing unused PENDING tokens of the same type for this
 * user before creating the new one (prevents token pile-up).
 */
export async function generateAndSendVerification(
  userId: string,
  email: string,
): Promise<void> {
  // Invalidate any existing unused tokens for this user + type.
  await db.verificationToken.updateMany({
    where: {
      userId,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const token = generateToken();

  await db.verificationToken.create({
    data: {
      userId,
      token,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      expiresAt: expiryDate(),
    },
  });

  await sendVerificationEmail(email, token, APP_BASE_URL);
}

/**
 * Verify an email verification token. Sets User.emailVerifiedAt and marks
 * the token as used.
 *
 * Throws AuthError if:
 *   - Token not found (404)
 *   - Token already used (409)
 *   - Token expired (410)
 *   - Token type mismatch (400)
 */
export async function verifyEmail(token: string): Promise<{ ok: true }> {
  const record = await db.verificationToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, emailVerifiedAt: true } } },
  });

  if (!record) {
    throw new AuthError('Invalid or expired verification link', 404);
  }

  if (record.type !== TOKEN_TYPES.EMAIL_VERIFICATION) {
    throw new AuthError('Invalid token type', 400);
  }

  if (record.usedAt) {
    throw new AuthError('This verification link has already been used', 409);
  }

  if (record.expiresAt < new Date()) {
    throw new AuthError('This verification link has expired', 410);
  }

  // Mark the token as used + set emailVerifiedAt.
  await db.$transaction([
    db.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
