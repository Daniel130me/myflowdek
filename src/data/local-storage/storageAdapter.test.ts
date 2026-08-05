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

test('migrateState recovers safely from invalid non-object input', () => {
  const migratedNull = migrateState(null);
  assert.strictEqual(migratedNull.version, STORAGE_VERSION);
  assert.ok(migratedNull.projects);

  const migratedString = migrateState('invalid string');
  assert.strictEqual(migratedString.version, STORAGE_VERSION);
  assert.ok(migratedString.projects);
});

test('migrateState recovers safely from malformed field types', () => {
  const malformed = {
    version: 'not-a-number',
    projects: 'invalid-projects-type',
    tasks: 'invalid-tasks-type',
  };
  const migrated = migrateState(malformed);
  assert.strictEqual(migrated.version, STORAGE_VERSION);
  assert.ok(typeof migrated.projects === 'object');
  assert.ok(Array.isArray(migrated.tasks));
});
