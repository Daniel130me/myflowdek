import { db } from '@/server/db/client';
import { randomBytes, createHash } from 'node:crypto';
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
 * Email verification service — with hashed token storage.
 *
 * Token lifecycle:
 *   1. Raw token generated (crypto-random hex) → emailed to the user
 *   2. SHA-256 hash of the token stored in the DB (never store the raw token)
 *   3. User clicks the link → POST /api/auth/verify-email with the raw token
 *   4. Server hashes the submitted token and looks up by hash
 *   5. Token verified → User.emailVerifiedAt set, token.usedAt set
 *   6. Token expires after VERIFICATION_TOKEN_TTL_HOURS (24h)
 *
 * This approach means a DB leak does NOT expose valid tokens — the
 * attacker would need to reverse the SHA-256 hash.
 */

/** Generate a cryptographically random URL-safe token. */
function generateToken(): string {
  const bytes = Math.ceil(TOKEN_LENGTH / 2);
  return randomBytes(bytes).toString('hex').slice(0, TOKEN_LENGTH);
}

/** Hash a token using SHA-256. The hash is stored in the DB; the raw
 *  token is only ever sent to the user via email. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Compute the expiry timestamp (now + TTL). */
function expiryDate(): Date {
  return new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * Generate a verification token for a user and send the verification email.
 * Stores the HASH of the token, not the raw token.
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

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  await db.verificationToken.create({
    data: {
      userId,
      token: tokenHash,
      type: TOKEN_TYPES.EMAIL_VERIFICATION,
      expiresAt: expiryDate(),
    },
  });

  await sendVerificationEmail(email, rawToken, APP_BASE_URL);
}

/**
 * Verify an email verification token. Hashes the submitted token and
 * looks up by the hash.
 */
export async function verifyEmail(token: string): Promise<{ ok: true }> {
  const tokenHash = hashToken(token);

  const record = await db.verificationToken.findUnique({
    where: { token: tokenHash },
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
