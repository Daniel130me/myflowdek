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
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createTaskSchema, updateTaskSchema } from './schemas';

/**
 * Keep database migrations aligned with fields selected by the task service.
 * A missing migration plus a stale client previously turned every task
 * creation into a 500 response.
 */
test('task formatting fields are backed by a database migration', () => {
  const migrationsDirectory = join(process.cwd(), 'prisma', 'migrations');
  const migrationSql = readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(join(migrationsDirectory, entry.name, 'migration.sql'), 'utf8'))
    .join('\n');

  for (const column of ['bold', 'color', 'level']) {
    assert.match(migrationSql, new RegExp(`ADD COLUMN "${column}"`, 'i'));
  }
});

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

  test('accepts and normalizes dates from HTML date inputs', () => {
    const res = createTaskSchema.safeParse({
      name: 'Date-only task',
      startDate: '2026-08-01',
      dueDate: '2026-08-15',
    });

    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.startDate, '2026-08-01T00:00:00.000Z');
      assert.equal(res.data.dueDate, '2026-08-15T00:00:00.000Z');
    }
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

  test('accepts and normalizes a date-only startDate on update', () => {
    const res = updateTaskSchema.safeParse({ startDate: '2026-08-01' });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.startDate, '2026-08-01T00:00:00.000Z');
    }
  });

  test('rejects an impossible calendar date on update', () => {
    const res = updateTaskSchema.safeParse({ startDate: '2026-02-30' });
    assert.equal(res.success, false);
  });

  // ------------------- sheet formatting fields (H-04) -------------------

  test('accepts sheet formatting fields (bold, color, level, isMilestone)', () => {
    const res = updateTaskSchema.safeParse({
      bold: true,
      color: '#0891B2',
      level: 3,
      isMilestone: true,
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.bold, true);
      assert.equal(res.data.color, '#0891B2');
      assert.equal(res.data.level, 3);
      assert.equal(res.data.isMilestone, true);
    }
  });

  test('accepts a null color (clearing the colour tag)', () => {
    const res = updateTaskSchema.safeParse({ color: null });
    assert.equal(res.success, true);
    if (res.success) assert.equal(res.data.color, null);
  });

  test('rejects a non-hex color value', () => {
    assert.equal(updateTaskSchema.safeParse({ color: 'red' }).success, false);
    assert.equal(updateTaskSchema.safeParse({ color: '#12345' }).success, false);
    assert.equal(updateTaskSchema.safeParse({ color: 'javascript:alert(1)' }).success, false);
  });

  test('rejects an out-of-range indent level', () => {
    assert.equal(updateTaskSchema.safeParse({ level: -1 }).success, false);
    assert.equal(updateTaskSchema.safeParse({ level: 5 }).success, false);
    assert.equal(updateTaskSchema.safeParse({ level: 1.5 }).success, false);
  });

  test('accepts boundary indent levels 0 and 4', () => {
    assert.equal(updateTaskSchema.safeParse({ level: 0 }).success, true);
    assert.equal(updateTaskSchema.safeParse({ level: 4 }).success, true);
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
