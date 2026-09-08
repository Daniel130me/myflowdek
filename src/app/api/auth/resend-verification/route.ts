import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, getClientId, retryAfterSeconds } from '@/lib/rate-limit';
import { generateAndSendVerification } from '@/server/auth/verification.service';
import { db } from '@/server/db/client';

const resendSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

/**
 * POST /api/auth/resend-verification
 *
 * Resend the verification email. Unauthenticated by necessity: callers are
 * exactly the users who cannot sign in (audit H-19 enforcement). Defences:
 *   - rate-limited (3/min per IP — it sends email)
 *   - enumeration-safe: always answers { ok: true }, regardless of whether
 *     the address exists or is already verified
 */
export async function POST(request: Request) {
  const clientId = getClientId(request);
  const rl = rateLimit(`resend-verification:${clientId}`, {
    maxRequests: 3,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rl.retryAfterMs ?? 0)) } },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = resendSchema.safeParse(body);
    // Same generic success for invalid input — no shape probing.
    if (!parsed.success) {
      return NextResponse.json({ ok: true });
    }

    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, emailVerifiedAt: true },
    });

    // Only known, still-unverified addresses trigger a send.
    if (user && !user.emailVerifiedAt) {
      await generateAndSendVerification(user.id, user.email);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Even on internal errors, keep the enumeration-safe envelope.
    console.error('[resend-verification] error:', error);
    return NextResponse.json({ ok: true });
  }
}
