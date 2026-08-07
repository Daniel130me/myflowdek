import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/server/db/client';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const AVATAR_COLORS = ['#FE8029', '#0891B2', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];

/**
 * POST /api/auth/register
 * Creates a new user with a bcrypt-hashed password.
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

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        avatarColor,
        role: 'Project Manager',
      },
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
