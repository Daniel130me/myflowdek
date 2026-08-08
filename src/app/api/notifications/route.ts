import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  listNotifications,
  countUnread,
} from '@/server/notifications/notification.service';

/**
 * GET /api/notifications
 *
 * List the authenticated user's notifications, newest first. Supports
 * `?unreadOnly=true` for badge/counter queries and `?count=true` for
 * an unread-count-only response.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(request.url);

    // Lightweight count-only mode for badge polling.
    if (url.searchParams.get('count') === 'true') {
      const unreadCount = await countUnread(user.id);
      return NextResponse.json({ unreadCount });
    }

    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;

    const notifications = await listNotifications(user.id, { unreadOnly, limit });
    const unreadCount = await countUnread(user.id);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return authErrorResponse(error);
  }
}
