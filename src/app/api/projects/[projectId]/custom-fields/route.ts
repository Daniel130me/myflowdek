import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { listCustomFields, createCustomField, createCustomFieldSchema } from '@/server/custom-fields/custom-field.service';

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const fields = await listCustomFields(projectId);
    return NextResponse.json({ fields });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_PROJECT');
    const body = await req.json().catch(() => null);
    const parsed = createCustomFieldSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const field = await createCustomField(projectId, parsed.data);
    return NextResponse.json({ field }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
