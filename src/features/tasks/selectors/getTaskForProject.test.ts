import assert from 'node:assert';
import { test } from 'node:test';
import { getTaskForProject } from './getTaskForProject';
import type { Task } from '@/features/flowdeck/model';

const mockTasks: Record<string, Task[]> = {
  p1: [
    {
      id: 't1',
      projectId: 'p1',
      name: 'Task 1',
      status: 'in_progress',
      assignee: 'u1',
      start: '2026-08-01',
      duration: 3,
      progress: 50,
      priority: 'high',
      deps: [],
    },
  ],
  p2: [
    {
      id: 't2',
      projectId: 'p2',
      name: 'Task 2',
      status: 'backlog',
      assignee: 'u2',
      start: '2026-08-02',
      duration: 5,
      progress: 0,
      priority: 'medium',
      deps: [],
    },
  ],
};

test('getTaskForProject returns task when task belongs to requested project', () => {
  const task = getTaskForProject(mockTasks, 'p1', 't1');
  assert.ok(task !== null);
  assert.strictEqual(task?.name, 'Task 1');
});

test('getTaskForProject returns null for cross-project task lookup', () => {
  // t1 belongs to p1, so looking for t1 under p2 must return null
  const task = getTaskForProject(mockTasks, 'p2', 't1');
  assert.strictEqual(task, null);
});

test('getTaskForProject returns null for non-existent project or task', () => {
  assert.strictEqual(getTaskForProject(mockTasks, 'invalid', 't1'), null);
  assert.strictEqual(getTaskForProject(mockTasks, 'p1', 'invalid'), null);
});
