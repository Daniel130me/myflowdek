import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/server/auth/authorization';
import { verifyEmail } from '@/server/auth/verification.service';

const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/verify-email
 *
 * Verify an email address using the token from the verification email.
 * Sets User.emailVerifiedAt and marks the token as used (in a transaction).
 *
 * No authentication required — the token itself is the capability.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    await verifyEmail(parsed.data.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
