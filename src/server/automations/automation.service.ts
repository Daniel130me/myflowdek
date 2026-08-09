import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createAutomationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  trigger: z.object({
    type: z.enum(['status_change', 'assignee_change', 'priority_change', 'due_date_approaching', 'task_created', 'task_completed']),
    field: z.string().optional(),
    value: z.string().optional(),
    daysBefore: z.number().optional(),
  }),
  actions: z.array(z.object({
    type: z.enum(['set_status', 'set_priority', 'set_assignee', 'add_tag', 'remove_tag', 'add_comment', 'set_due_date', 'notify']),
    value: z.string().optional(),
    field: z.string().optional(),
  })),
});

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export function listAutomations(projectId: string) {
  return db.automationRule.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
}

export async function createAutomation(projectId: string, input: CreateAutomationInput) {
  return db.automationRule.create({
    data: { projectId, name: input.name, trigger: input.trigger, actions: input.actions },
  });
}

export async function toggleAutomation(automationId: string, enabled: boolean) {
  return db.automationRule.update({ where: { id: automationId }, data: { enabled } })
    .catch(() => { throw new AuthError('Automation not found', 404); });
}

export async function deleteAutomation(automationId: string) {
  await db.automationRule.delete({ where: { id: automationId } })
    .catch(() => { throw new AuthError('Automation not found', 404); });
}
