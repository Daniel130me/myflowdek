import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/server/auth/authorization';
import { resetPassword } from '@/server/auth/password-reset.service';

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/reset-password
 *
 * Reset a password using a token from the reset email. Verifies the token,
 * hashes the new password, updates the user, and invalidates the token —
 * all in a transaction.
 *
 * No authentication required — the token itself is the capability.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    await resetPassword(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
