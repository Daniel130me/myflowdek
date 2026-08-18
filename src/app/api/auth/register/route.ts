import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/server/db/client';
import {
  BCRYPT_ROUNDS,
  DEFAULT_JOB_TITLE,
  AVATAR_COLORS,
  NAME_MAX_LENGTH,
} from '@/lib/auth.constants';
import { passwordSchema } from '@/lib/password-policy';
import { rateLimit, RATE_LIMITS, getClientId, retryAfterSeconds } from '@/lib/rate-limit';
import { audit } from '@/server/audit/log';

/** Request body validation. Password uses the central password policy. */
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(NAME_MAX_LENGTH, 'Name is too long'),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: passwordSchema,
});

/** Pick a random avatar colour from the shared palette. */
function pickAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * POST /api/auth/register
 *
 * Creates a new user with a bcrypt-hashed password. Handles the duplicate-email
 * race condition by catching Prisma's P2002 unique-constraint error and
 * returning a clean 409 (the pre-check + insert can race under concurrent
 * requests; the DB constraint is the source of truth).
 *
 * Rate-limited per IP (5 requests/minute) to slow brute-force registration.
 * Audit-logs every attempt (success and failure).
 */
export async function POST(request: Request) {
  // --- Rate limit ---
  const clientId = getClientId(request);
  const rl = rateLimit(`register:${clientId}`, RATE_LIMITS.register);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.retryAfterMs ?? 0)) } },
    );
  }

  const userAgent = request.headers.get('user-agent') ?? null;

  try {
    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    // Pre-check for a friendlier error (the DB constraint below is the real
    // guard against the race condition).
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      await audit({ action: 'register_failed', ip: clientId, userAgent, meta: { reason: 'duplicate_email', email } });
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        avatarColor: pickAvatarColor(),
        jobTitle: DEFAULT_JOB_TITLE,
      },
      // Only return the safe, non-sensitive fields.
      select: { id: true, email: true, name: true },
    });

    // Generate + send the email verification token (non-blocking — if the
    // email fails, registration still succeeds).
    const { generateAndSendVerification } = await import('@/server/auth/verification.service');
    await generateAndSendVerification(user.id, email).catch((err) => {
      console.error('[register] verification email failed:', err);
    });

    await audit({ userId: user.id, action: 'register', ip: clientId, userAgent });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // P2002 = unique constraint violation. This handles the race condition
    // where two concurrent registrations pass the pre-check but the second
    // insert hits the DB's unique index on email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      await audit({ action: 'register_failed', ip: clientId, userAgent, meta: { reason: 'race_duplicate_email' } });
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // Any other error: log the real detail internally, return a generic
    // message. Never expose internal failure details to the client.
    console.error('[register] error:', error);
    await audit({ action: 'register_failed', ip: clientId, userAgent, meta: { reason: 'internal_error' } });
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }
}
