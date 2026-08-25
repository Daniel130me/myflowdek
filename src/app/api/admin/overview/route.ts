import { NextResponse } from 'next/server';
import { requireSuperAdmin, authErrorResponse } from '@/server/auth/authorization';
import { getOverview } from '@/server/admin/admin.service';

/**
 * GET /api/admin/overview
 *
 * Platform-level metrics for the admin dashboard. SUPER_ADMIN only.
 * Returns aggregate counts: users, workspaces, projects, tasks, storage,
 * failed logins, new registrations.
 */
export async function GET() {
  try {
    await requireSuperAdmin();
    const overview = await getOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return authErrorResponse(error);
  }
}
