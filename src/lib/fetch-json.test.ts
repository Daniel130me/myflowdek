/**
 * Tests for the fetchJson helper (audit H-14): mutation handlers must learn
 * about HTTP failures instead of toasting success on a 403/500.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { fetchJson, HttpError } from './fetch-json';

/** Swap global fetch for one canned response, restoring it after the test. */
async function withFetch(body: string, status: number, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(body, { status })) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

describe('fetchJson', () => {
  test('throws HttpError with the server { error } message on non-2xx', async () => {
    await withFetch(JSON.stringify({ error: 'Not allowed' }), 403, async () => {
      await assert.rejects(
        fetchJson('/x'),
        (err: unknown) => err instanceof HttpError && err.status === 403 && err.message === 'Not allowed',
      );
    });
  });

  test('also understands the { message } envelope shape', async () => {
    await withFetch(JSON.stringify({ message: 'Invalid AI request.' }), 400, async () => {
      await assert.rejects(
        fetchJson('/x'),
        (err: unknown) => err instanceof HttpError && err.message === 'Invalid AI request.',
      );
    });
  });

  test('falls back to a generic status message when the body is unreadable', async () => {
    await withFetch('not json', 500, async () => {
      await assert.rejects(
        fetchJson('/x'),
        (err: unknown) => err instanceof HttpError && err.message.includes('500'),
      );
    });
  });

  test('returns the parsed body on success', async () => {
    await withFetch(JSON.stringify({ ok: true }), 200, async () => {
      assert.deepEqual(await fetchJson('/x'), { ok: true });
    });
  });
});
