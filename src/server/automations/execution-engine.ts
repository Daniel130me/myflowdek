import { db } from '@/server/db/client';
import type { Prisma } from '@prisma/client';
import { createNotification } from '@/server/notifications/notification.service';
import { NOTIFICATION_TYPES } from '@/server/notifications/constants';

/**
 * Automation execution engine.
 *
 * Executes automation rules when a trigger event occurs. The engine is
 * called from backend task mutations (task.service.ts) — NOT from the
 * frontend.
 *
 * Loop prevention: a per-request execution depth guard prevents infinite
 * loops (e.g. a status-change automation that triggers another status
 * change that triggers the same automation).
 */

/** Maximum execution depth — prevents infinite loops. */
const MAX_EXECUTION_DEPTH = 5;

/** Per-request execution tracker — prevents the same automation from
 *  executing twice in the same chain. */
const executionChain = new WeakMap<object, Set<string>>();

/**
 * Execute automations for a given trigger event.
 *
 * @param projectId The project the task belongs to.
 * @param triggerType The trigger type (e.g. 'status_change', 'task_created').
 * @param task The task that triggered the event.
 * @param depth Current execution depth (for loop prevention).
 * @param chainCtx A context object used to track the execution chain
 *                  (prevents the same automation from re-executing).
 */
export async function executeAutomations(
  projectId: string,
  triggerType: string,
  task: { id: string; name: string; status: string; priority: string; assigneeId: string | null; dueDate: Date | null },
  depth = 0,
  chainCtx: object = {},
): Promise<void> {
  if (depth >= MAX_EXECUTION_DEPTH) {
    console.warn('[automations] max execution depth reached, stopping to prevent infinite loop');
    return;
  }

  // Get or create the execution chain for this context.
  let chain = executionChain.get(chainCtx);
  if (!chain) {
    chain = new Set();
    executionChain.set(chainCtx, chain);
  }

  // Find enabled automation rules for this project + trigger type.
  const rules = await db.automationRule.findMany({
    where: {
      projectId,
      enabled: true,
    },
  });

  for (const rule of rules) {
    // Skip if this rule already executed in the current chain (loop prevention).
    if (chain.has(rule.id)) continue;
    chain.add(rule.id);

    const trigger = rule.trigger as { type: string; field?: string; value?: string };
    if (trigger.type !== triggerType) continue;

    // Check trigger conditions.
    if (triggerType === 'status_change' && trigger.value && task.status !== trigger.value) continue;
    if (triggerType === 'priority_change' && trigger.value && task.priority !== trigger.value) continue;

    // Execute actions.
    const actions = rule.actions as Array<{ type: string; value?: string; field?: string }>;
    for (const action of actions) {
      await executeAction(projectId, task, action, depth, chainCtx);
    }
  }
}

/** Execute a single automation action. */
async function executeAction(
  projectId: string,
  task: { id: string; name: string; status: string; priority: string; assigneeId: string | null; dueDate: Date | null },
  action: { type: string; value?: string; field?: string },
  depth: number,
  chainCtx: object,
): Promise<void> {
  switch (action.type) {
    case 'set_status': {
      if (!action.value || task.status === action.value) return;
      await db.task.update({
        where: { id: task.id },
        data: { status: action.value, completedAt: action.value === 'done' ? new Date() : null },
      });
      // Re-trigger automations for the status change (with incremented depth).
      await executeAutomations(projectId, 'status_change', { ...task, status: action.value }, depth + 1, chainCtx);
      break;
    }
    case 'set_priority': {
      if (!action.value) return;
      await db.task.update({ where: { id: task.id }, data: { priority: action.value } });
      await executeAutomations(projectId, 'priority_change', { ...task, priority: action.value }, depth + 1, chainCtx);
      break;
    }
    case 'set_assignee': {
      if (!action.value) return;
      await db.task.update({ where: { id: task.id }, data: { assigneeId: action.value } });
      break;
    }
    case 'add_tag': {
      if (!action.value) return;
      const tag = await db.tag.findFirst({ where: { projectId, name: action.value } });
      if (tag) {
        await db.taskTag.create({ data: { taskId: task.id, tagId: tag.id } }).catch(() => {});
      }
      break;
    }
    case 'remove_tag': {
      if (!action.value) return;
      const tag = await db.tag.findFirst({ where: { projectId, name: action.value } });
      if (tag) {
        await db.taskTag.deleteMany({ where: { taskId: task.id, tagId: tag.id } });
      }
      break;
    }
    case 'add_comment': {
      if (!action.value) return;
      await db.comment.create({
        data: {
          taskId: task.id,
          projectId,
          text: action.value,
          authorId: null, // System-generated comment
        },
      });
      break;
    }
    case 'set_due_date': {
      if (!action.value) return;
      const dueDate = new Date(action.value);
      if (!isNaN(dueDate.getTime())) {
        await db.task.update({ where: { id: task.id }, data: { dueDate } });
      }
      break;
    }
    case 'notify': {
      // Notify the task's assignee (if any).
      if (task.assigneeId) {
        await createNotification(
          task.assigneeId,
          NOTIFICATION_TYPES.STATUS_CHANGED,
          `Automation triggered on "${task.name}"`,
          { projectId, taskId: task.id },
        );
      }
      break;
    }
  }
}
