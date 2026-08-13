import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse } from '@/server/auth/authorization';
import { requestPasswordReset } from '@/server/auth/password-reset.service';
import { rateLimit, getClientId, retryAfterSeconds } from '@/lib/rate-limit';

const forgotSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

/**
 * POST /api/auth/forgot-password
 *
 * Request a password reset email. Always returns 200 — even if the email
 * doesn't exist — to prevent email enumeration attacks.
 *
 * Rate-limited: 3 requests per minute per IP (stricter than login/register
 * because this endpoint sends emails).
 */
export async function POST(request: Request) {
  // --- Rate limit (3/min per IP — stricter because it sends emails) ---
  const clientId = getClientId(request);
  const rl = rateLimit(`forgot-password:${clientId}`, {
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
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      // Return the same generic success to avoid enumeration.
      return NextResponse.json({ ok: true });
    }

    await requestPasswordReset(parsed.data.email);

    // Always return success — never reveal whether the email exists.
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Even on errors, return generic success to avoid enumeration.
    console.error('[forgot-password] error:', error);
    return NextResponse.json({ ok: true });
  }
}
