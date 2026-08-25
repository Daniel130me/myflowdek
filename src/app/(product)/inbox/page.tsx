'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { InboxView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useNotifications } from '@/features/flowdeck/hooks/useNotifications';
import { routes } from '@/shared/navigation/routes';

/**
 * Inbox page.
 *
 * Phase 4 (item 8): the page now fetches from `GET /api/notifications`
 * via `useNotifications` instead of deriving entries from
 * `state.activityByProject` + `state.commentsByProject`. The server
 * creates real Notification rows on assign/reply/mention/due-date, so the
 * inbox is consistent across devices and sessions.
 */
export default function InboxRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <InboxView
      notifications={notifications}
      unreadCount={unreadCount}
      loading={loading}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      projects={state.projects}
      onOpenTask={(projectId, taskId) => {
        state.openProject(projectId);
        router.push(routes.task(projectId, taskId));
      }}
    />
  );
}
