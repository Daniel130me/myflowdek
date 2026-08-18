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

test('migrateState preserves valid existing data fields and converts inprogress to in_progress', () => {
  const sample = {
    version: 1,
    currentProjectId: 'p2',
    projects: { p1: { id: 'p1', name: 'Test' } },
    tasksByProject: { p1: [{ id: 't1', projectId: 'p1', name: 'Task 1', status: 'inprogress' }] },
  };
  const migrated = migrateState(sample);
  assert.strictEqual(migrated.currentProjectId, 'p2');
  assert.strictEqual((migrated.projects as any).p1.name, 'Test');
  assert.strictEqual(migrated.tasksByProject?.p1[0].status, 'in_progress');
});

test('migrateState recovers safely from invalid non-object input', () => {
  const migratedNull = migrateState(null);
  assert.strictEqual(migratedNull.version, STORAGE_VERSION);
  assert.ok(migratedNull.projects);

  const migratedString = migrateState('invalid string');
  assert.strictEqual(migratedString.version, STORAGE_VERSION);
  assert.ok(migratedString.projects);
});

test('migrateState preserves all project-level collections and activeView', () => {
  const sample = {
    version: 2,
    activeView: 'board',
    customColsByProject: { p1: [{ key: 'c1', label: 'Col 1', type: 'text' }] },
    tagsByProject: { p1: [{ id: 'tg1', name: 'Tag 1', color: '#FE8029' }] },
    commentsByProject: { p1: [{ id: 'cm1', taskId: 't1', text: 'Hello' }] },
    activityByProject: { p1: [{ id: 'act1', taskId: 't1', type: 'created', description: 'Created', authorId: 'u1', timestamp: '2026-07-01' }] },
    timeLogsByProject: { p1: [{ id: 'tl1', taskId: 't1', minutes: 30, note: 'Work' }] },
    sectionsByProject: { p1: [{ id: 'sec1', projectId: 'p1', name: 'Sprint 1', position: 0 }] },
    statusUpdatesByProject: { p1: [{ id: 'su1', projectId: 'p1', text: 'Status update' }] },
    savedFilters: [{ id: 'sf1', name: 'My filter' }],
  };

  const migrated = migrateState(sample);
  assert.strictEqual(migrated.activeView, 'board');
  assert.strictEqual(migrated.customColsByProject?.p1[0].label, 'Col 1');
  assert.strictEqual(migrated.tagsByProject?.p1[0].name, 'Tag 1');
  assert.strictEqual(migrated.commentsByProject?.p1[0].text, 'Hello');
  assert.strictEqual(migrated.activityByProject?.p1[0].description, 'Created');
  assert.strictEqual(migrated.timeLogsByProject?.p1[0].minutes, 30);
  assert.strictEqual(migrated.sectionsByProject?.p1[0].name, 'Sprint 1');
  assert.strictEqual(migrated.statusUpdatesByProject?.p1[0].text, 'Status update');
  assert.strictEqual(migrated.savedFilters?.[0].name, 'My filter');
});

test('migrateState assigns projectId from collection key for legacy tasksByProject missing projectId', () => {
  const sample = {
    tasksByProject: {
      p1: [{ id: 't1', name: 'Task 1' }],
    },
  };
  const migrated = migrateState(sample);
  assert.strictEqual(migrated.tasksByProject?.p1[0].projectId, 'p1');
});

test('migrateState enforces collection key as projectId even if task has wrong projectId', () => {
  const sample = {
    tasksByProject: {
      p2: [{ id: 't1', projectId: 'p1', name: 'Task 1' }],
    },
  };
  const migrated = migrateState(sample);
  assert.strictEqual(migrated.tasksByProject?.p2[0].projectId, 'p2');
});

