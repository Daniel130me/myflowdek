import { db } from '@/server/db/client';

/**
 * Task recurrence execution service.
 *
 * When a recurring task is marked as 'done', this service creates the next
 * occurrence based on the recurrence pattern (daily, weekly, monthly).
 *
 * This is designed to be called by:
 *   - A cron job (e.g. Vercel Cron, Render Cron, or external scheduler)
 *   - A background worker
 *   - Or manually via a script
 *
 * The service finds all tasks where:
 *   - recurrence IS NOT NULL
 *   - status = 'done'
 *   - completedAt is within the last 24 hours (avoids re-processing old tasks)
 *   - No subsequent task has been created from this one (checked by
 *     recurrenceSourceId — see below)
 *
 * For each matching task, it creates a new task with:
 *   - Same name, description, assignee, priority, tags
 *   - Status = 'backlog'
 *   - New due date calculated from the recurrence pattern
 *   - recurrenceSourceId = original task (lineage — distinct from `parentId`,
 *     which is the subtask hierarchy only)
 *   - parentId inherited from the original task (so a recurring subtask's
 *     next occurrence stays under the same parent — but it is NOT made a
 *     child of the original task)
 */

/** Maximum recurrence depth — prevents infinite chains if something goes wrong. */
const MAX_RECURRENCE_DEPTH = 100;

/** Compute the next occurrence date based on the recurrence pattern. */
function computeNextDate(currentDate: Date, recurrence: string): Date {
  const d = new Date(currentDate);
  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      return d; // Unknown pattern — don't advance
  }
  return d;
}

/**
 * Process all completed recurring tasks and create their next occurrences.
 *
 * Returns the number of new tasks created.
 *
 * Intended to be called periodically (e.g. every hour). Each call:
 *   1. Finds recently-completed recurring tasks
 *   2. For each, checks if a next occurrence already exists (prevents duplicates)
 *   3. Creates the next occurrence with the computed due date
 */
export async function processRecurringTasks(): Promise<number> {
  // Find tasks completed in the last 24 hours that have a recurrence pattern.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const completedRecurring = await db.task.findMany({
    where: {
      recurrence: { not: null },
      status: 'done',
      completedAt: { gte: since },
    },
    select: {
      id: true,
      name: true,
      description: true,
      projectId: true,
      assigneeId: true,
      priority: true,
      duration: true,
      dueDate: true,
      recurrence: true,
      parentId: true,
      createdById: true,
      tags: { select: { tagId: true } },
    },
  });

  let created = 0;
  let depth = 0;

  for (const task of completedRecurring) {
    if (depth >= MAX_RECURRENCE_DEPTH) break;
    if (!task.recurrence || !task.dueDate) continue;

    // Check if a next occurrence already exists. We match on
    // `recurrenceSourceId` (pointing back to this task) rather than `parentId`
    // — `parentId` is the subtask hierarchy and would yield false positives
    // if the user has manually nested tasks under this one. Only the
    // recurrence service ever sets `recurrenceSourceId`, so a match here is
    // authoritative.
    const existing = await db.task.findFirst({
      where: {
        recurrenceSourceId: task.id,
      },
      select: { id: true },
    });

    if (existing) continue; // Already created — skip

    // Compute the next due date.
    const nextDueDate = computeNextDate(task.dueDate, task.recurrence);

    // Create the next occurrence.
    //
    // `recurrenceSourceId` records the lineage (which task produced this one).
    // `parentId` is inherited from the source so a recurring subtask's next
    // occurrence stays under the same parent — but we do NOT set
    // `parentId = task.id` (that would conflate recurrence with subtasking).
    const newTask = await db.task.create({
      data: {
        projectId: task.projectId,
        name: task.name,
        description: task.description,
        status: 'backlog',
        priority: task.priority,
        dueDate: nextDueDate,
        duration: task.duration,
        assigneeId: task.assigneeId,
        createdById: task.createdById,
        parentId: task.parentId, // Preserve subtask position (may be null)
        recurrenceSourceId: task.id, // Lineage pointer to the source task
        recurrence: task.recurrence, // Carry the recurrence forward
      },
    });

    // Copy tags to the new task.
    if (task.tags.length > 0) {
      await db.taskTag.createMany({
        data: task.tags.map(t => ({ taskId: newTask.id, tagId: t.tagId })),
        skipDuplicates: true,
      });
    }

    created++;
    depth++;
  }

  if (created > 0) {
    console.log(`[recurrence] created ${created} recurring task occurrences`);
  }

  return created;
}
