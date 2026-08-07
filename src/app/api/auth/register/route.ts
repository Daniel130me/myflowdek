import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/server/db/client';
import {
  BCRYPT_ROUNDS,
  DEFAULT_USER_ROLE,
  AVATAR_COLORS,
  PASSWORD_MIN_LENGTH,
  NAME_MAX_LENGTH,
} from '@/lib/auth.constants';

/** Request body validation for registration. Constraints live as named
 *  constants so the UI can reference the same limits if needed. */
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(NAME_MAX_LENGTH, 'Name is too long'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
});

/** Pick a random avatar colour from the shared palette. Kept tiny and
 *  self-contained so callers don't import `Math.random` boilerplate. */
function pickAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * POST /api/auth/register
 *
 * Creates a new user with a bcrypt-hashed password. Two DB calls:
 *   1. `findUnique` on the email unique index — cheap, no scan.
 *   2. `create` — single insert.
 * No N+1; the avatar colour is chosen in memory.
 */
export async function POST(request: Request) {
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

    // Existence check against the email unique index (not a table scan).
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
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
        role: DEFAULT_USER_ROLE,
      },
      // Only return the safe, non-sensitive fields.
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('[register] error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }
}
