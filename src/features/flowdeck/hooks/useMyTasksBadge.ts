'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Server-driven "open tasks assigned to me" count for the My Tasks
 * sidebar badge (audit Low: My Tasks badge).
 *
 * The old badge counted `state.tasksByProject[currentProjectId]` — the
 * project-scoped client store. On workspace-level pages (dashboard,
 * settings, portfolio) that store is empty, so the badge vanished
 * exactly when the user navigated away from a project, and it compared
 * against the legacy client user id instead of the session.
 * GET /api/tasks/my is the same canonical source the My Tasks page
 * renders from, so the badge now agrees with what the page shows.
 *
 * One fetch is shared across every consumer (mini external store via
 * useSyncExternalStore), refetched on window focus so it self-heals
 * after task mutations in other tabs. Call `invalidateMyTasksBadge()`
 * after any mutation that changes the user's open-task set.
 */

interface BadgeStore {
  /** null = never fetched (badge hidden), number = last known count. */
  count: number | null;
  inflight: Promise<void> | null;
  subscribers: Set<() => void>;
}

const store: BadgeStore = { count: null, inflight: null, subscribers: new Set() };

function emit(): void {
  for (const fn of store.subscribers) fn();
}

export function fetchMyTasksBadge(force = false): Promise<void> | undefined {
  if (typeof window === 'undefined') return undefined;
  if (store.inflight) return store.inflight;
  if (!force && store.count !== null) return undefined;
  store.inflight = (async () => {
    try {
      const res = await fetch('/api/tasks/my?limit=200');
      if (!res.ok) throw new Error(`badge fetch failed: ${res.status}`);
      const data = await res.json();
      const tasks: Array<{ status?: string }> = data.tasks ?? [];
      store.count = tasks.filter(t => t.status !== 'done').length;
    } catch {
      // Keep the previous count (or null = hidden). A transient failure
      // should never make the badge lie; the next focus refetches.
    } finally {
      store.inflight = null;
      emit();
    }
  })();
  return store.inflight;
}

/** Drop the cached count and refetch — call after task mutations. */
export function invalidateMyTasksBadge(): void {
  store.count = null;
  emit();
  void fetchMyTasksBadge(true);
}

function subscribe(cb: () => void): () => void {
  store.subscribers.add(cb);
  void fetchMyTasksBadge();
  return () => {
    store.subscribers.delete(cb);
  };
}

export function useMyTasksBadge(): number {
  const count = useSyncExternalStore(
    subscribe,
    () => store.count ?? 0,
    () => 0,
  );

  // Self-heal: tab focus means state may have changed elsewhere.
  useEffect(() => {
    const onFocus = () => {
      void fetchMyTasksBadge(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return count;
}
