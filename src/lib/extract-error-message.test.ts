/**
 * Error-envelope mapping tests (audit H-16).
 *
 * The API surfaces three coexisting failure shapes. The client used to read
 * only `{ error }`, so every `{ message }` failure (validationError,
 * apiError, all talent routes) degraded to a meaningless "HTTP 4xx" toast.
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { extractErrorMessage } from './api-client';

describe('extractErrorMessage (H-16)', () => {
  test('reads the flowdeck { error } shape', () => {
    assert.equal(extractErrorMessage({ error: 'Authentication required' }, 401), 'Authentication required');
  });

  test('reads the { message } shape (apiError / talent routes)', () => {
    assert.equal(extractErrorMessage({ message: 'Resource was not found.' }, 404), 'Resource was not found.');
  });

  test('prefers { error } when both keys exist', () => {
    assert.equal(extractErrorMessage({ error: 'specific', message: 'generic' }, 400), 'specific');
  });

  test('surfaces the first Zod field issue from { message, issues }', () => {
    const body = { message: 'Invalid request.', issues: { name: ['Task name is required'], priority: ['Invalid priority'] } };
    assert.equal(extractErrorMessage(body, 400), 'Task name is required');
  });

  test('falls back to { message } when issues is empty', () => {
    const body = { message: 'Invalid request.', issues: {} };
    assert.equal(extractErrorMessage(body, 400), 'Invalid request.');
  });

  test('ignores blank error/message strings', () => {
    assert.equal(extractErrorMessage({ error: '   ' }, 500), 'Request failed (HTTP 500)');
    assert.equal(extractErrorMessage({ message: '' }, 502), 'Request failed (HTTP 502)');
  });

  test('handles non-object and unparsable bodies', () => {
    assert.equal(extractErrorMessage(null, 500), 'Request failed (HTTP 500)');
    assert.equal(extractErrorMessage('Gateway Timeout', 504), 'Request failed (HTTP 504)');
    assert.equal(extractErrorMessage({}, 400), 'Request failed (HTTP 400)');
  });
});
