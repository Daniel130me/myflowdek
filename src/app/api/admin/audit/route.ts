import { NextResponse } from 'next/server';
import { requireSuperAdmin, authErrorResponse } from '@/server/auth/authorization';
import { listAuditEvents } from '@/server/admin/admin.service';

/**
 * GET /api/admin/audit
 *
 * List recent security audit events. SUPER_ADMIN only.
 * Supports ?limit, ?offset, and ?action for filtering.
 */
export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
    const action = url.searchParams.get('action') ?? undefined;

    const events = await listAuditEvents({ limit, offset, action });
    return NextResponse.json({ events });
  } catch (error) {
    return authErrorResponse(error);
  }
}
