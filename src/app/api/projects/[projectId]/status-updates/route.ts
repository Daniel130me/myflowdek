import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { listStatusUpdates, createStatusUpdate, createStatusUpdateSchema } from '@/server/status-updates/status-update.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const updates = await listStatusUpdates(projectId);
    return NextResponse.json({ updates });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'CREATE_COMMENT');
    const body = await req.json().catch(() => null);
    const parsed = createStatusUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const update = await createStatusUpdate(projectId, user.id, parsed.data);
    return NextResponse.json({ update }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
