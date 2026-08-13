/**
 * Task Zod schema validation tests.
 *
 * Pure, self-contained tests for `createTaskSchema` and `updateTaskSchema`
 * in `src/server/tasks/schemas.ts`. No database required.
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { createTaskSchema, updateTaskSchema } from './schemas';

/* --------------------------- createTaskSchema --------------------------- */

describe('createTaskSchema', () => {
  test('accepts a minimal valid payload (name only)', () => {
    const res = createTaskSchema.safeParse({ name: 'Write tests' });
    assert.equal(res.success, true);
  });

  test('accepts a fully-populated valid payload', () => {
    const res = createTaskSchema.safeParse({
      name: 'Task with everything',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      startDate: '2026-08-01T00:00:00.000Z',
      dueDate: '2026-08-15T00:00:00.000Z',
      duration: 5,
      parentId: 'parent-1',
      assigneeId: 'user-1',
      sectionId: 'section-1',
    });
    assert.equal(res.success, true);
  });

  test('rejects an empty name', () => {
    const res = createTaskSchema.safeParse({ name: '' });
    assert.equal(res.success, false);
  });

  test('rejects a name longer than TASK_NAME_MAX_LENGTH (200)', () => {
    const res = createTaskSchema.safeParse({ name: 'x'.repeat(201) });
    assert.equal(res.success, false);
  });

  test('rejects a missing name field', () => {
    const res = createTaskSchema.safeParse({ description: 'no name' });
    assert.equal(res.success, false);
  });

  test('rejects an invalid status enum', () => {
    const res = createTaskSchema.safeParse({ name: 'T', status: 'archived' });
    assert.equal(res.success, false);
  });

  test('rejects an invalid priority enum', () => {
    const res = createTaskSchema.safeParse({ name: 'T', priority: 'blocker' });
    assert.equal(res.success, false);
  });

  test('rejects a negative duration', () => {
    const res = createTaskSchema.safeParse({ name: 'T', duration: -1 });
    assert.equal(res.success, false);
  });

  test('rejects a non-integer duration', () => {
    const res = createTaskSchema.safeParse({ name: 'T', duration: 1.5 });
    assert.equal(res.success, false);
  });

  test('rejects a description longer than TASK_DESCRIPTION_MAX_LENGTH (5000)', () => {
    const res = createTaskSchema.safeParse({ name: 'T', description: 'x'.repeat(5001) });
    assert.equal(res.success, false);
  });

  test('accepts null for nullable optional fields', () => {
    const res = createTaskSchema.safeParse({
      name: 'T',
      description: null,
      startDate: null,
      dueDate: null,
      parentId: null,
      assigneeId: null,
      sectionId: null,
    });
    assert.equal(res.success, true);
  });

  test('rejects an invalid ISO date for startDate', () => {
    const res = createTaskSchema.safeParse({ name: 'T', startDate: 'not-a-date' });
    assert.equal(res.success, false);
  });

  test('accepts the four valid statuses', () => {
    for (const status of ['backlog', 'in_progress', 'review', 'done']) {
      const res = createTaskSchema.safeParse({ name: 'T', status });
      assert.equal(res.success, true, `status=${status} should be valid`);
    }
  });

  test('accepts the four valid priorities', () => {
    for (const priority of ['low', 'medium', 'high', 'urgent']) {
      const res = createTaskSchema.safeParse({ name: 'T', priority });
      assert.equal(res.success, true, `priority=${priority} should be valid`);
    }
  });

  test('trims whitespace from name', () => {
    const res = createTaskSchema.safeParse({ name: '  Trim me  ' });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.name, 'Trim me');
    }
  });
});

/* --------------------------- updateTaskSchema --------------------------- */

describe('updateTaskSchema', () => {
  test('accepts an empty object (partial update)', () => {
    const res = updateTaskSchema.safeParse({});
    assert.equal(res.success, true);
  });

  test('accepts a name-only update', () => {
    const res = updateTaskSchema.safeParse({ name: 'New name' });
    assert.equal(res.success, true);
  });

  test('rejects an empty name on update', () => {
    const res = updateTaskSchema.safeParse({ name: '' });
    assert.equal(res.success, false);
  });

  test('rejects a name longer than 200 chars on update', () => {
    const res = updateTaskSchema.safeParse({ name: 'x'.repeat(201) });
    assert.equal(res.success, false);
  });

  test('accepts progress within 0-100', () => {
    assert.equal(updateTaskSchema.safeParse({ progress: 0 }).success, true);
    assert.equal(updateTaskSchema.safeParse({ progress: 50 }).success, true);
    assert.equal(updateTaskSchema.safeParse({ progress: 100 }).success, true);
  });

  test('rejects progress below 0 or above 100', () => {
    assert.equal(updateTaskSchema.safeParse({ progress: -1 }).success, false);
    assert.equal(updateTaskSchema.safeParse({ progress: 101 }).success, false);
  });

  test('rejects invalid status/priority on update', () => {
    assert.equal(updateTaskSchema.safeParse({ status: 'invalid' }).success, false);
    assert.equal(updateTaskSchema.safeParse({ priority: 'invalid' }).success, false);
  });

  test('rejects negative or non-integer duration on update', () => {
    assert.equal(updateTaskSchema.safeParse({ duration: -1 }).success, false);
    assert.equal(updateTaskSchema.safeParse({ duration: 1.5 }).success, false);
  });

  test('accepts null for nullable fields on update', () => {
    const res = updateTaskSchema.safeParse({
      description: null,
      dueDate: null,
      startDate: null,
      parentId: null,
      assigneeId: null,
      sectionId: null,
    });
    assert.equal(res.success, true);
  });

  test('accepts the four valid statuses on update', () => {
    for (const status of ['backlog', 'in_progress', 'review', 'done']) {
      const res = updateTaskSchema.safeParse({ status });
      assert.equal(res.success, true);
    }
  });

  test('accepts the four valid priorities on update', () => {
    for (const priority of ['low', 'medium', 'high', 'urgent']) {
      const res = updateTaskSchema.safeParse({ priority });
      assert.equal(res.success, true);
    }
  });

  test('rejects an invalid ISO date for startDate on update', () => {
    const res = updateTaskSchema.safeParse({ startDate: '2026-08-01' }); // date-only is NOT a datetime
    assert.equal(res.success, false);
  });

  test('rejects unknown extra fields via Zod default (strict-by-default for object?) — schemas use .object which strips unknowns, not rejects', () => {
    // Zod object schemas default to stripping unknown keys; this test
    // documents that behaviour so a future tightening to .strict() is
    // intentional.
    const res = updateTaskSchema.safeParse({ name: 'T', unexpected: 'value' });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal((res.data as Record<string, unknown>).unexpected, undefined);
    }
  });
});
