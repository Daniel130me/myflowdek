import { db } from '@/server/db/client';
import type { NotificationType } from './constants';

/**
 * Notification service — creates and manages user-facing notifications.
 *
 * Notifications are distinct from the ActivityEntry feed:
 *   - ActivityEntry → project-wide timeline (what happened on a task)
 *   - Notification  → user-specific inbox (what YOU need to know)
 *
 * Every create call is a single INSERT. Never throws — if the notification
 * write fails, the main operation should still succeed.
 */

/**
 * Create a notification for a user. Never throws — notification creation
 * is a side-effect, not a critical path.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  opts?: {
    actorId?: string | null;
    projectId?: string | null;
    taskId?: string | null;
  },
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        message,
        actorId: opts?.actorId ?? null,
        projectId: opts?.projectId ?? null,
        taskId: opts?.taskId ?? null,
      },
    });
  } catch (err) {
    console.error('[notifications] failed to create:', type, err);
  }
}

/**
 * List notifications for a user, newest first. Supports an `unreadOnly`
 * filter for badge counts.
 */
export function listNotifications(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
  return db.notification.findMany({
    where: {
      userId,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
  });
}

/** Count unread notifications for a user (for badge display). */
export function countUnread(userId: string) {
  return db.notification.count({
    where: { userId, readAt: null },
  });
}

/** Mark a single notification as read. */
export async function markAsRead(notificationId: string, userId: string) {
  // Verify ownership — a user can only mark their own notifications.
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });
  if (!notification) return null;
  if (notification.userId !== userId) return null;

  return db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

/** Mark all unread notifications for a user as read. */
export async function markAllAsRead(userId: string) {
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
