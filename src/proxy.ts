import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit, RATE_LIMITS, retryAfterSeconds } from '@/lib/rate-limit';

/**
 * Global API mutation rate limiting (audit Table 7.1 — "Rate-limit wiring:
 * defined but unwired").
 *
 * Next.js 16 note: the interception file is `proxy.ts` (the renamed
 * middleware).
 *
 * `RATE_LIMITS.generalMutation` existed but no route called it, leaving most
 * mutating endpoints (members, tags, sections, budgets, automations,
 * invitations, goals, …) unlimited. Rather than hand-wiring a call into 100+
 * route handlers — and hoping every future route remembers one — the general
 * per-user/per-IP cap is enforced here, centrally, for every /api mutation.
 *
 * Stricter per-route limiters (login, register, forgot-password, resend,
 * ai, bulk) keep applying on top; this is the shared ceiling, not a
 * replacement.
 *
 * /api/cron/* is exempt: those calls authenticate with the cron secret and
 * run on machine schedules.
 */
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const CRON_PREFIX = '/api/cron';

export async function proxy(request: NextRequest) {
  if (!MUTATION_METHODS.has(request.method)) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api') || pathname.startsWith(CRON_PREFIX)) {
    return NextResponse.next();
  }

  // Prefer the authenticated identity so one abusive session cannot shift
  // buckets by rotating IPs; fall back to the client IP for anonymous calls
  // (NextAuth's own authorize() limits login separately).
  let identity: string;
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    identity = token?.sub ? `user:${token.sub}` : `ip:${clientIp(request)}`;
  } catch {
    identity = `ip:${clientIp(request)}`;
  }

  const result = rateLimit(`mutation:${identity}`, RATE_LIMITS.generalMutation);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds(result.retryAfterMs ?? 0)) },
      },
    );
  }

  return NextResponse.next();
}

function clientIp(request: NextRequest): string {
  // x-forwarded-for is only honoured when the deployment runs behind the
  // platform proxy that overwrites it (TRUST_PROXY=true) — same policy as
  // getClientId() in lib/rate-limit.
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export const config = {
  // Static assets never carry mutations, but skipping them here keeps the
  // middleware from even running on those requests.
  matcher: '/api/:path*',
};
