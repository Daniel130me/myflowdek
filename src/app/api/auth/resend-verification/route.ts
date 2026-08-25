import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { generateAndSendVerification } from '@/server/auth/verification.service';
import { db } from '@/server/db/client';

const resendSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

/**
 * POST /api/auth/resend-verification
 *
 * Resend the verification email. The caller must be authenticated (we need
 * the userId to generate the token). If the email is already verified, this
 * is a no-op (returns 200 with a message).
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const body = await request.json().catch(() => null);
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    // Verify the email matches the authenticated user.
    if (parsed.data.email !== user.email) {
      return NextResponse.json(
        { error: 'Email does not match the authenticated account' },
        { status: 400 },
      );
    }

    // If already verified, no need to resend.
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });
    if (dbUser?.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    await generateAndSendVerification(user.id, user.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
