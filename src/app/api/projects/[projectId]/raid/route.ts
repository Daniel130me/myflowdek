import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  createRaidItem,
  createRaidItemSchema,
  listRaidItems,
} from '@/server/raid/raid.service';

/**
 * GET /api/projects/:projectId/raid — list the project's RAID log items.
 * Any project member can view.
 */
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

/**
 * POST /api/projects/:projectId/raid — log a new RAID item
 * (risk / assumption / issue / dependency). Requires EDIT_TASK — the same
 * level as logging regular project work; viewers cannot create entries.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'EDIT_TASK');

    const parsed = createRaidItemSchema.safeParse(await request.json().catch(() => null));
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
