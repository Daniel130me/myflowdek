/**
 * Board WIP-limit persistence (audit Low: WIP limit persistence).
 *
 * WIP limits are a per-board working agreement — they shape how the team
 * wants to work, they are not business data — so localStorage is the
 * right home, under the same policy the store applies to UI state:
 * anything that must survive a reload but not sync across devices lives
 * in localStorage; anything server-owned belongs to the API.
 *
 * Limits are keyed by project id so switching boards can never leak a
 * column limit from one project into another. Reads and writes are
 * guarded for SSR and for browsers in private mode.
 */

const STORAGE_KEY = 'flowdeck_wip_limits_v1';

/** projectId -> column status -> card limit. */
export type WipLimitMap = Record<string, Record<string, number>>;

export function loadWipLimits(): WipLimitMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: WipLimitMap = {};
    for (const [pid, cols] of Object.entries(parsed as Record<string, unknown>)) {
      if (!cols || typeof cols !== 'object') continue;
      const limits: Record<string, number> = {};
      for (const [status, val] of Object.entries(cols as Record<string, unknown>)) {
        if (typeof val === 'number' && Number.isFinite(val) && val > 0) limits[status] = val;
      }
      out[pid] = limits;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveWipLimits(map: WipLimitMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage full or private mode — limits then behave as before: session-only */
  }
}
