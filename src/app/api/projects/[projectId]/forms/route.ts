import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectMember, authErrorResponse } from '@/server/auth/authorization';
import { listForms, createForm, createFormSchema } from '@/server/forms/form.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const forms = await listForms(projectId);
    return NextResponse.json({ forms });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const body = await req.json().catch(() => null);
    const parsed = createFormSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const form = await createForm(projectId, parsed.data);
    return NextResponse.json({ form }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
