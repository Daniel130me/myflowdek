import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { checkMutationLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { listRaidItems, createRaidItem, createRaidItemSchema } from '@/server/raid/raid.service';

/**
 * RAID log endpoints (audit C-01 — the log previously had no persistence).
 *
 * GET  /api/projects/:projectId/raid — list items. Any project member.
 * POST /api/projects/:projectId/raid — create an item. OWNER/ADMIN/MEMBER.
 */

/** GET /api/projects/:projectId/raid — list RAID items. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');

    const items = await listRaidItems(projectId);
    return NextResponse.json({ items });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/projects/:projectId/raid — create a RAID item. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const rl = checkMutationLimit(request, RATE_LIMITS.generalMutation, 'raid-create');
    if (rl) return rl;

    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_RAID');

    const body = await request.json().catch(() => null);
    const parsed = createRaidItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const item = await createRaidItem(projectId, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
