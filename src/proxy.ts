import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isTalentNetworkEnabled } from '@/server/talent/feature-flags';

export function proxy(request: NextRequest) {
  if (isTalentNetworkEnabled()) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'The Talent Network is currently unavailable.' },
      { status: 503 },
    );
  }

  const destination = request.nextUrl.clone();
  destination.pathname = '/projects';
  destination.searchParams.set('talent', 'disabled');
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: [
    '/talent/:path*',
    '/api/talent/:path*',
    '/api/tasks/:taskId/competencies',
    '/api/tasks/:taskId/talent-invitations/:path*',
    '/api/tasks/:taskId/opportunity/:path*',
    '/api/tasks/:taskId/talent-matches',
    '/api/tasks/:taskId/suggest-competencies',
  ],
};
