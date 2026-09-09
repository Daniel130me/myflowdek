import assert from 'node:assert';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Audit Table 5.1 — optimistic rollback:
 *
 * Every task mutation used to roll back to a whole-list snapshot captured
 * BEFORE the mutation, so a second concurrent change that landed while the
 * failed request was in flight was silently erased. The failure paths now
 * re-sync the canonical list from GET /api/projects/:id/tasks instead.
 *
 * These are wiring tests: they pin the contract that failure paths call
 * `resyncTasksFromServer` and no longer restore `[projectId]: snapshot`.
 */
const storeSource = (): string =>
  readFileSync(join(process.cwd(), 'src/features/flowdeck/store/useFlowDeck.ts'), 'utf-8');

function fnBody(source: string, name: string, span = 2400): string {
  const start = source.indexOf(`const ${name}`);
  assert.ok(start > 0, `${name} must exist in the store`);
  return source.slice(start, start + span);
}

test('failed single-task mutations re-sync from the server, not a stale snapshot', () => {
  const source = storeSource();
  for (const name of ['toggleComplete', 'moveStatus', 'toggleTaskTag']) {
    const body = fnBody(source, name);
    assert.ok(
      body.includes('resyncTasksFromServer'),
      `${name} must re-sync from the server on failure`,
    );
    assert.ok(
      !body.includes('[projectId]: snapshot'),
      `${name} must not roll back to a stale whole-list snapshot`,
    );
  }
});

test('failed bulk mutations re-sync from the server, not a stale snapshot', () => {
  const source = storeSource();
  for (const name of ['removeTasksBulk', 'bulkSetDueDate', 'bulkComplete']) {
    const body = fnBody(source, name);
    assert.ok(
      body.includes('resyncTasksFromServer'),
      `${name} must re-sync from the server on failure`,
    );
  }
});

test('resyncTasksFromServer maps the canonical GET response into the store', () => {
  const source = storeSource();
  const start = source.indexOf('const resyncTasksFromServer');
  assert.ok(start > 0, 'resyncTasksFromServer helper must exist');
  const body = source.slice(start, start + 900);
  assert.ok(body.includes('/api/projects/'), 'must GET the project tasks endpoint');
  assert.ok(body.includes('mapApiTask'), 'must map the API shape to the client model');
  assert.ok(body.includes('setTasksByProject'), 'must write the refreshed list into the store');
});
