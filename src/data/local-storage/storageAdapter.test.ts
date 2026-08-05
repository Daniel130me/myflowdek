import assert from 'node:assert';
import { test } from 'node:test';
import { migrateState, STORAGE_VERSION } from './storageAdapter';

test('migrateState provides default fallback arrays if input is null or missing fields', () => {
  const migrated = migrateState({});
  assert.strictEqual(migrated.version, STORAGE_VERSION);
  assert.ok(Array.isArray(migrated.tasks));
  assert.ok(Array.isArray(migrated.files));
  assert.ok(typeof migrated.projects === 'object');
});

test('migrateState preserves valid existing data fields', () => {
  const sample = {
    version: 1,
    currentProjectId: 'p2',
    projects: { p1: { id: 'p1', name: 'Test' } },
    tasks: [{ id: 't1', name: 'Task 1' }],
  };
  const migrated = migrateState(sample);
  assert.strictEqual(migrated.currentProjectId, 'p2');
  assert.strictEqual((migrated.projects as any).p1.name, 'Test');
  assert.strictEqual(migrated.tasks?.length, 1);
});
