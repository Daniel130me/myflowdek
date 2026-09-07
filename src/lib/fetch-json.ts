/**
 * JSON fetch helper for client-side mutation handlers.
 *
 * `fetch()` does NOT throw on HTTP error statuses — a 403/500 resolves
 * normally, so handlers that `await fetch(...)` then `toast.success(...)`
 * celebrate failures and only snap back on refetch (audit H-14).
 *
 * `fetchJson` throws an `HttpError` carrying the server's own message when
 * available (it understands the { error } and { message } response shapes
 * the API uses), which makes the canonical handler shape honest:
 *
 *   try {
 *     await fetchJson(url, options);
 *     toast.success('Saved');
 *   } catch (error) {
 *     toast.error(error instanceof Error ? error.message : 'Failed');
 *   }
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const candidate =
      ('error' in body && typeof body.error === 'string' && body.error) ||
      ('message' in body && typeof body.message === 'string' && body.message);
    if (candidate) return candidate;
  }
  return `Request failed (HTTP ${status})`;
}

/** Fetch JSON, throwing `HttpError` (with the server's message) on non-2xx. */
export async function fetchJson<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new HttpError(res.status, extractErrorMessage(body, res.status));
  }
  return body as T;
}
