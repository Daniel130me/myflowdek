import assert from 'node:assert';
import test from 'node:test';
import { routes, getRouteForView, getViewFromPathname } from './routes';

test('routes generator functions produce correct paths', () => {
  assert.strictEqual(routes.projects(), '/projects');
  assert.strictEqual(routes.myTasks(), '/my-tasks');
  assert.strictEqual(routes.projectOverview('p1'), '/projects/p1/overview');
  assert.strictEqual(routes.projectTasks('p1'), '/projects/p1/tasks');
  assert.strictEqual(routes.task('p1', 't101'), '/projects/p1/tasks/t101');
  assert.strictEqual(routes.file('p1', 'f1'), '/projects/p1/files/f1');
});

test('getRouteForView resolves view IDs correctly', () => {
  assert.strictEqual(getRouteForView('projects'), '/projects');
  assert.strictEqual(getRouteForView('mytasks'), '/my-tasks');
  assert.strictEqual(getRouteForView('dashboard', 'proj-1'), '/projects/proj-1/overview');
  assert.strictEqual(getRouteForView('board', 'proj-1'), '/projects/proj-1/board');
  assert.strictEqual(getRouteForView('dashboard'), '/projects');
});

test('getViewFromPathname extracts active view correctly', () => {
  assert.strictEqual(getViewFromPathname('/my-tasks'), 'mytasks');
  assert.strictEqual(getViewFromPathname('/inbox'), 'inbox');
  assert.strictEqual(getViewFromPathname('/projects'), 'projects');
  assert.strictEqual(getViewFromPathname('/projects/p1/overview'), 'dashboard');
  assert.strictEqual(getViewFromPathname('/projects/p1/board'), 'board');
  assert.strictEqual(getViewFromPathname('/projects/p1/timeline'), 'timeline');
});
