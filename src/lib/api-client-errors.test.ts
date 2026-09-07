/**
 * Tests for the client-side API error envelope mapping (audit H-16): the
 * server returns several error shapes and the client must surface the real
 * message instead of "HTTP 400".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extractApiErrorMessage } from './api-client';

describe('extractApiErrorMessage', () => {
  test('prefers the explicit { error } shape', () => {
    assert.equal(extractApiErrorMessage({ error: 'Not found in this project' }, 404), 'Not found in this project');
  });

  test('reads the first zod validation issue from { message, issues }', () => {
    const body = { message: 'Invalid request.', issues: { dueDate: ['Due date must be after start date'] } };
    assert.equal(extractApiErrorMessage(body, 400), 'Due date must be after start date');
  });

  test('falls back to { message } when there are no issues', () => {
    assert.equal(extractApiErrorMessage({ message: 'Resource was not found.' }, 404), 'Resource was not found.');
  });

  test('degrades to the status text for unrecognised bodies', () => {
    assert.equal(extractApiErrorMessage(null, 502), 'HTTP 502');
    assert.equal(extractApiErrorMessage({}, 400), 'HTTP 400');
  });
});
