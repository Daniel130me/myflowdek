/**
 * Central JSON fetch helper (audit H-14 / H-16).
 *
 * `fetch` does not throw on 4xx/5xx, which is why several mutation handlers
 * toasted success on failures. Every mutation should go through here and
 * branch on `ok`. The error extraction understands both legacy response
 * shapes the API returns ({error} and {message, issues}) so failures surface
 * the real server message instead of a generic 'HTTP 4xx'.
 */
export type FetchJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export async function fetchJson<T = Record<string, unknown>>(
  input: string,
  init?: RequestInit,
): Promise<FetchJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, status: 0, error: 'Network error — check your connection and try again.' };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. empty 204) is fine on success, opaque on failure.
  }

  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string; issues?: { message?: string }[] };
    const error =
      d.error ||
      d.message ||
      d.issues?.[0]?.message ||
      `Request failed (HTTP ${res.status})`;
    return { ok: false, status: res.status, error };
  }

  return { ok: true, data: (data ?? {}) as T };
}
