import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectMember, authErrorResponse } from '@/server/auth/authorization';
import { listAutomations, createAutomation, createAutomationSchema } from '@/server/automations/automation.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const automations = await listAutomations(projectId);
    return NextResponse.json({ automations });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const body = await req.json().catch(() => null);
    const parsed = createAutomationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const automation = await createAutomation(projectId, parsed.data);
    return NextResponse.json({ automation }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
