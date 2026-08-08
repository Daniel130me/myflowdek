import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { markAllAsRead } from '@/server/notifications/notification.service';

/**
 * POST /api/notifications/read-all
 *
 * Mark all unread notifications for the authenticated user as read.
 * Returns the count of notifications that were marked.
 */
export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    const markedCount = await markAllAsRead(user.id);
    return NextResponse.json({ marked: markedCount });
  } catch (error) {
    return authErrorResponse(error);
  }
}
