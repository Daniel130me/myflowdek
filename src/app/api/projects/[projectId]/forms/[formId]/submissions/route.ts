import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { listSubmissions, submitForm, submitFormSchema } from '@/server/forms/form.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string; formId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, formId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const submissions = await listSubmissions(formId);
    return NextResponse.json({ submissions });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string; formId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, formId } = await params;
    // Submission is open to any project member (or could be public).
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const body = await req.json().catch(() => null);
    const parsed = submitFormSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const submission = await submitForm(formId, projectId, parsed.data.data, user.id);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
