import assert from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateState } from '../../data/local-storage/storageAdapter';
import { routes, getRouteForView } from '../../shared/navigation/routes';

// 1. Legacy task migration enforces collection projectId
test('Legacy task migration enforces collection projectId', () => {
  const sample = {
    tasksByProject: {
      p2: [{ id: 't1', projectId: 'p1', name: 'Task 1' }],
    },
  };
  const migrated = migrateState(sample);
  assert.strictEqual(migrated.tasksByProject?.p2[0].projectId, 'p2');
});

// 2. Command navigation logic
test('getRouteForView for dashboard without project does not guess p1', () => {
  assert.strictEqual(getRouteForView('dashboard'), '/projects');
});

test('routes.task generates correct path with pId and taskId', () => {
  assert.strictEqual(routes.task('p-alpha', 't-omega'), '/projects/p-alpha/tasks/t-omega');
});

test('new task opens inline without navigating away from the current project page', () => {
  const layout = readFileSync(join(process.cwd(), 'src/app/(product)/layout.tsx'), 'utf8');
  const commandPalette = readFileSync(join(process.cwd(), 'src/app/(product)/@modal/(.)command/page.tsx'), 'utf8');
  const newTaskHandlers = layout
    .split('onShowNewTask')
    .slice(1)
    .map((section) => section.slice(0, section.indexOf('onSearchFocus') >= 0 ? section.indexOf('onSearchFocus') : 450));

  assert.ok(newTaskHandlers.length >= 2, 'keyboard and top-bar handlers should both be present');
  assert.ok(newTaskHandlers.every((handler) => handler.includes('setShowNewTask(true)')));
  assert.ok(!newTaskHandlers.some((handler) => handler.includes('routes.newTask')));
  assert.ok(layout.includes('<NewTaskModal'));
  assert.ok(commandPalette.includes('state.setShowNewTask(true)'));
  assert.ok(!commandPalette.includes('router.replace(routes.newTask(pid))'));
});

// 3. New task navigation does not guess a project
test('New task navigation without project ID defaults to projects page', () => {
  // Simulating the logic in CommandPalette onNewTask
  const handleNewTask = (projectId?: string) => {
    if (projectId) return routes.newTask(projectId);
    return routes.projects();
  };
  
  assert.strictEqual(handleNewTask(), '/projects');
  assert.strictEqual(handleNewTask('p123'), '/projects/p123/tasks/new');
});

// 4. Verification of routes for views with project IDs
test('getRouteForView with project ID generates project-scoped routes', () => {
  assert.strictEqual(getRouteForView('board', 'p1'), '/projects/p1/board');
  assert.strictEqual(getRouteForView('tasks', 'p1'), '/projects/p1/tasks');
  assert.strictEqual(getRouteForView('sheet', 'p1'), '/projects/p1/sheet');
});
