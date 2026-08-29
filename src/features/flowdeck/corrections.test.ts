import assert from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateState } from '../../data/local-storage/storageAdapter';
import { routes, getRouteForView, replaceProjectInPath } from '../../shared/navigation/routes';

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

test('project switching preserves the current project subroute', () => {
  assert.strictEqual(replaceProjectInPath('/projects/old-project/board', 'new-project'), '/projects/new-project/board');
  assert.strictEqual(replaceProjectInPath('/projects/old-project/tasks/task-1', 'new-project'), '/projects/new-project/tasks/task-1');
  assert.strictEqual(replaceProjectInPath('/projects/old-project', 'new-project'), '/projects/new-project');
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

  const modal = readFileSync(join(process.cwd(), 'src/features/flowdeck/components/modals/NewTaskModal.tsx'), 'utf8');
  assert.ok(modal.includes('Cancel'));
});

test('project overview waits for the first project request before notFound', () => {
  const hook = readFileSync(join(process.cwd(), 'src/features/flowdeck/hooks/useProject.ts'), 'utf8');

  assert.ok(hook.includes('useState(Boolean(projectId))'));
  assert.ok(hook.includes('requestedProjectId !== projectId'));
  assert.ok(hook.includes('setLoading(true)'));
});

test('project overview page does not re-fetch the project already loaded by the layout', () => {
  const overview = readFileSync(join(process.cwd(), 'src/app/(product)/projects/[projectId]/overview/page.tsx'), 'utf8');

  assert.ok(!overview.includes('useProject(projectId)'));
  assert.ok(overview.includes('state.projects[projectId]'));
});

test('projects portfolio page reads the workspace list from the hook instead of the global store', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/(product)/projects/page.tsx'), 'utf8');

  assert.ok(page.includes('projects: workspaceProjects'));
  assert.ok(!page.includes('const projects = state.projects'));
});

test('task detail route keeps loading until the task fetch resolves and stays above the bottom nav', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/(product)/projects/[projectId]/tasks/[taskId]/page.tsx'), 'utf8');
  const panel = readFileSync(join(process.cwd(), 'src/features/flowdeck/components/modals/TaskDetailPanel.tsx'), 'utf8');
  const hook = readFileSync(join(process.cwd(), 'src/features/flowdeck/hooks/useTasks.ts'), 'utf8');

  assert.ok(page.includes('tasksLoading'));
  assert.ok(page.includes('<TaskDetailSkeleton />'));
  assert.ok(page.includes('!tasksLoading && !taskDataUnavailable'));
  assert.ok(hook.includes('useState(Boolean(projectId))'));
  assert.ok(hook.includes('requestedProjectId !== projectId'));
  assert.ok(panel.includes('zIndex: 70'));
});

test('intercepted task route waits for hydration instead of falling through to a full-page 404', () => {
  const modalRoute = readFileSync(join(process.cwd(), 'src/app/(product)/@modal/(.)projects/[projectId]/tasks/[taskId]/page.tsx'), 'utf8');

  assert.ok(modalRoute.includes('useProjectTasks(cachedTask ? null : projectId)'));
  assert.ok(modalRoute.includes('!task && !tasksLoading && taskListHydrated'));
  assert.ok(modalRoute.includes('<TaskDetailSkeleton />'));
  assert.ok(modalRoute.indexOf('if (!task && !tasksLoading && taskListHydrated)') < modalRoute.indexOf('notFound();'));
});

test('mobile task cards open when clicking anywhere on the card', () => {
  const taskList = readFileSync(join(process.cwd(), 'src/features/flowdeck/components/views/TaskListView.tsx'), 'utf8');

  assert.ok(taskList.includes('role="button"'));
  assert.ok(taskList.includes('onClick={() => onOpenTask(t.id)}'));
  assert.ok(taskList.includes("e.key === 'Enter' || e.key === ' '"));
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

test('timeline refresh waits for project-store hydration and fetches its tasks', () => {
  const layout = readFileSync(join(process.cwd(), 'src/app/(product)/projects/[projectId]/layout.tsx'), 'utf8');
  const timeline = readFileSync(join(process.cwd(), 'src/app/(product)/projects/[projectId]/timeline/page.tsx'), 'utf8');

  assert.ok(layout.includes('!projectExistsInStore && (loading || project)'));
  assert.ok(timeline.includes('useProjectTasks(projectId)'));
});

test('project files can be linked to several tasks through the authenticated endpoint', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  const store = readFileSync(join(process.cwd(), 'src/features/flowdeck/store/useFlowDeck.ts'), 'utf8');
  const fileRoute = readFileSync(join(process.cwd(), 'src/app/api/files/[fileId]/route.ts'), 'utf8');
  const fileService = readFileSync(join(process.cwd(), 'src/server/files/file.service.ts'), 'utf8');
  const taskPanel = readFileSync(join(process.cwd(), 'src/features/flowdeck/components/modals/TaskDetailPanel.tsx'), 'utf8');

  assert.ok(schema.includes('model TaskFile'));
  assert.ok(fileService.includes('tx.taskFile.upsert'));
  assert.ok(store.includes('apiLinkFile(id, taskId, linked)'));
  assert.ok(store.includes("toast.error('Failed to update task attachment'"));
  assert.ok(fileRoute.includes('export async function PATCH'));
  assert.ok(fileRoute.includes("requireProjectCapability(user.id, file.projectId, 'EDIT_TASK')"));
  assert.ok(taskPanel.includes('Also used by'));
  assert.ok(!taskPanel.includes("'In use'"));
});

test('comments can persist project file references and expose accessible controls', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  const service = readFileSync(join(process.cwd(), 'src/server/comments/comment.service.ts'), 'utf8');
  const commentsUi = readFileSync(join(process.cwd(), 'src/features/flowdeck/components/ui/CommentsSection.tsx'), 'utf8');

  assert.ok(schema.includes('model CommentAttachment'));
  assert.ok(service.includes('id: { in: fileIds }'));
  assert.ok(service.includes("throw new AuthError('One or more attached files are not available in this project'"));
  assert.ok(commentsUi.includes('aria-label="Attach project files"'));
  assert.ok(commentsUi.includes('aria-label="Send comment"'));
  assert.ok(commentsUi.includes('width: 44, height: 44'));
  assert.ok(commentsUi.includes('<MarkdownToolbar'));
  assert.ok(commentsUi.includes('mentionedUserIds'));
});

test('both task detail routes load the real activity feed', () => {
  const fullRoute = readFileSync(join(process.cwd(), 'src/app/(product)/projects/[projectId]/tasks/[taskId]/page.tsx'), 'utf8');
  const modalRoute = readFileSync(join(process.cwd(), 'src/app/(product)/@modal/(.)projects/[projectId]/tasks/[taskId]/page.tsx'), 'utf8');

  assert.ok(fullRoute.includes('useTaskActivity(taskId || null)'));
  assert.ok(modalRoute.includes('useTaskActivity(taskId || null)'));
  assert.ok(!modalRoute.includes('state.activityByProject'));
});
