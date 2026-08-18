/**
 * Notification type constants.
 *
 * Machine codes stored in the `Notification.type` column. Each maps to a
 * human-readable message template. The message is pre-rendered at write
 * time so the notification list is cheap to read.
 */
export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  MENTIONED: 'mentioned',
  REPLIED: 'replied',
  DUE_SOON: 'due_soon',
  OVERDUE: 'overdue',
  INVITATION: 'invitation',
  APPROVAL: 'approval',
  STATUS_CHANGED: 'status_changed',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
