import { NextResponse } from 'next/server';
import { requireSuperAdmin, authErrorResponse } from '@/server/auth/authorization';
import { getSystemHealth } from '@/server/admin/admin.service';

/**
 * GET /api/admin/health
 *
 * System health check. SUPER_ADMIN only.
 * Verifies the database connection and returns latency + migration count.
 */
export async function GET() {
  try {
    await requireSuperAdmin();
    const health = await getSystemHealth();
    return NextResponse.json(health);
  } catch (error) {
    return authErrorResponse(error);
  }
}
