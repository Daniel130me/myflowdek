import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { deleteForm } from '@/server/forms/form.service';
import { db } from '@/server/db/client';
import { z } from 'zod';

const updateFormSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  fields: z.array(z.object({
    id: z.string(), label: z.string(),
    type: z.enum(['text', 'textarea', 'number', 'date', 'select', 'email']),
    required: z.boolean().default(false), options: z.array(z.string()).optional(),
  })).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string; formId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, formId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');
    const form = await db.form.findUnique({ where: { id: formId }, include: { _count: { select: { submissions: true } } } });
    if (!form || form.projectId !== projectId) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json({ form });
  } catch (e) { return authErrorResponse(e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string; formId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, formId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_FORMS');

    // IDOR guard: verify the form belongs to this project before mutating.
    const existing = await db.form.findUnique({ where: { id: formId }, select: { projectId: true } });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = updateFormSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const form = await db.form.update({ where: { id: formId }, data: parsed.data });
    return NextResponse.json({ form });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string; formId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, formId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_FORMS');

    // IDOR guard: verify the form belongs to this project before deleting.
    const existing = await db.form.findUnique({ where: { id: formId }, select: { projectId: true } });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await deleteForm(formId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
