import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { markAsRead } from '@/server/notifications/notification.service';

/**
 * PATCH /api/notifications/:id/read
 *
 * Mark a single notification as read. The user can only mark their own
 * notifications — ownership is verified in the service.
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { notificationId } = await params;

    const notification = await markAsRead(notificationId, user.id);
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    return authErrorResponse(error);
  }
}
