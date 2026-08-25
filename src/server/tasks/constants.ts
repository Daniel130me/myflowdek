/**
 * Task-related constants.
 */

export const TASK_NAME_MAX_LENGTH = 200;
export const TASK_NAME_MIN_LENGTH = 1;
export const TASK_DESCRIPTION_MAX_LENGTH = 5000;

/** Valid task statuses. */
export const TASK_STATUSES = ['backlog', 'in_progress', 'review', 'done'] as const;

/** Valid task priorities. */
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
