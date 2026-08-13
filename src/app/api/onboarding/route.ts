import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { completeOnboarding, parseOnboardingInput } from '@/server/onboarding/service';

/**
 * POST /api/onboarding
 *
 * Completes onboarding for the authenticated user in a single DB transaction:
 * creates a workspace, an OWNER membership, an optional first project, and
 * sets user.onboardedAt (the server-side source of truth for onboarding state).
 *
 * After a successful call the client must refetch the NextAuth session so the
 * JWT picks up the new onboardedAt timestamp.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const body = await request.json().catch(() => null);
    const input = parseOnboardingInput(body);

    const result = await completeOnboarding(user.id, input);

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
