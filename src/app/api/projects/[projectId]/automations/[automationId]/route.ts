import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { toggleAutomation, deleteAutomation } from '@/server/automations/automation.service';
import { db } from '@/server/db/client';
import { z } from 'zod';

const updateAutomationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  trigger: z.object({
    type: z.enum(['status_change', 'assignee_change', 'priority_change', 'due_date_approaching', 'task_created', 'task_completed']),
    field: z.string().optional(), value: z.string().optional(), daysBefore: z.number().optional(),
  }).optional(),
  actions: z.array(z.object({
    type: z.enum(['set_status', 'set_priority', 'set_assignee', 'add_tag', 'remove_tag', 'add_comment', 'set_due_date', 'notify']),
    value: z.string().optional(), field: z.string().optional(),
  })).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string; automationId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, automationId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_AUTOMATIONS');
    const body = await req.json().catch(() => null);
    const parsed = updateAutomationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const automation = await db.automationRule.update({ where: { id: automationId }, data: parsed.data });
    return NextResponse.json({ automation });
  } catch (e) { return authErrorResponse(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string; automationId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, automationId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_AUTOMATIONS');
    await deleteAutomation(automationId);
    return NextResponse.json({ ok: true });
  } catch (e) { return authErrorResponse(e); }
}
