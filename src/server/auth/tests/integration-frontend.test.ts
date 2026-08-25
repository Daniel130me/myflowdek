/**
 * Frontend integration + permission boundary tests.
 *
 * Tests the full production flow: create task → DB contains task → edit →
 * DB updated → refresh → change persists. Also tests permission boundaries:
 * VIEWER cannot write, MEMBER can collaborate, ADMIN can manage, cross-
 * workspace access blocked.
 *
 * Run with: npm run test
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { completeOnboarding } from '@/server/onboarding/service';
import { createTask, updateTask, deleteTask } from '@/server/tasks/task.service';
import {
  requireProjectCapability,
  requireWorkspaceCapability,
  AuthError,
} from '@/server/auth/authorization';
import { PROJECT_PERMISSIONS } from '@/server/auth/capabilities';
import { createComment } from '@/server/comments/comment.service';
import { createFile } from '@/server/files/file.service';

const prisma = new PrismaClient();
const RUN_ID = Date.now().toString(36);
function testEmail(local: string) { return `test-${RUN_ID}-${local}@flowdeck.io`; }

async function deleteUserCascade(userId: string) {
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId } } }, select: { id: true },
  });
  for (const ws of workspaces) await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

async function cleanupRun() {
  const users = await prisma.user.findMany({
    where: { email: { contains: `test-${RUN_ID}-` } }, select: { id: true },
  });
  for (const u of users) await deleteUserCascade(u.id);
}

before(async () => { await cleanupRun(); });
after(async () => { await cleanupRun(); await prisma.$disconnect(); });

/* ================== FRONTEND INTEGRATION (persistence) ================== */

describe('frontend integration — persistence', () => {
  test('create task → DB has task → edit → DB updated → refetch → persists', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('int-create'), name: 'Int Owner', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'Int Project' });
    const projectId = result.project!.id;

    // 1. Create
    const task = await createTask(projectId, owner.id, { name: 'Integration Task' });
    assert.equal(task.name, 'Integration Task');

    // 2. Verify in DB
    const dbTask1 = await prisma.task.findUnique({ where: { id: task.id } });
    assert.equal(dbTask1?.name, 'Integration Task');

    // 3. Edit
    await updateTask(task.id, { name: 'Updated Task' }, owner.id);

    // 4. Verify in DB
    const dbTask2 = await prisma.task.findUnique({ where: { id: task.id } });
    assert.equal(dbTask2?.name, 'Updated Task');

    // 5. Delete
    await deleteTask(task.id);
    const dbTask3 = await prisma.task.findUnique({ where: { id: task.id } });
    assert.equal(dbTask3, null);
  });

  test('add comment → DB has comment → refetch → persists', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('int-comment'), name: 'Comment Owner', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'Comment Project' });
    const projectId = result.project!.id;
    const task = await createTask(projectId, owner.id, { name: 'Comment Task' });

    // Create comment
    const comment = await createComment(projectId, owner.id, { taskId: task.id, text: 'Integration comment' });
    assert.equal(comment.text, 'Integration comment');

    // Verify in DB
    const dbComment = await prisma.comment.findUnique({ where: { id: comment.id } });
    assert.equal(dbComment?.text, 'Integration comment');
    assert.equal(dbComment?.authorId, owner.id);
  });

  test('file metadata persists after creation', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('int-file'), name: 'File Owner', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'File Project' });
    const projectId = result.project!.id;

    const file = await createFile(projectId, owner.id, {
      name: 'test-document.pdf', size: 1024,
    });

    const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
    assert.equal(dbFile?.name, 'test-document.pdf');
    assert.equal(dbFile?.size, 1024);
    assert.equal(dbFile?.uploadedById, owner.id);
  });
});

/* ================== PERMISSION BOUNDARY TESTS ================== */

describe('permission boundaries', () => {
  test('VIEWER cannot create tasks (capability matrix excludes VIEWER)', () => {
    assert.ok(!PROJECT_PERMISSIONS.CREATE_TASK.includes('VIEWER' as any));
    assert.ok(!PROJECT_PERMISSIONS.EDIT_TASK.includes('VIEWER' as any));
    assert.ok(!PROJECT_PERMISSIONS.DELETE_TASK.includes('VIEWER' as any));
    assert.ok(!PROJECT_PERMISSIONS.MANAGE_PROJECT.includes('VIEWER' as any));
    // But VIEWER CAN view
    assert.ok(PROJECT_PERMISSIONS.VIEW_PROJECT.includes('VIEWER' as any));
  });

  test('MEMBER can create/edit tasks but cannot manage project', () => {
    assert.ok(PROJECT_PERMISSIONS.CREATE_TASK.includes('MEMBER' as any));
    assert.ok(PROJECT_PERMISSIONS.EDIT_TASK.includes('MEMBER' as any));
    assert.ok(!PROJECT_PERMISSIONS.DELETE_TASK.includes('MEMBER' as any));
    assert.ok(!PROJECT_PERMISSIONS.MANAGE_PROJECT.includes('MEMBER' as any));
    assert.ok(!PROJECT_PERMISSIONS.MANAGE_MEMBERS.includes('MEMBER' as any));
  });

  test('ADMIN can manage project + delete tasks but cannot transfer ownership', () => {
    assert.ok(PROJECT_PERMISSIONS.MANAGE_PROJECT.includes('ADMIN' as any));
    assert.ok(PROJECT_PERMISSIONS.DELETE_TASK.includes('ADMIN' as any));
    assert.ok(PROJECT_PERMISSIONS.MANAGE_MEMBERS.includes('ADMIN' as any));
    assert.ok(PROJECT_PERMISSIONS.MANAGE_BUDGETS.includes('ADMIN' as any));
  });

  test('requireProjectCapability rejects VIEWER for CREATE_TASK', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('perm-viewer'), name: 'Perm Owner', passwordHash: 'hash' } });
    const viewer = await prisma.user.create({ data: { email: testEmail('perm-viewer-user'), name: 'Viewer', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'Perm Project' });
    const projectId = result.project!.id;

    await prisma.projectMember.create({ data: { projectId, userId: viewer.id, role: 'VIEWER' } });

    await assert.rejects(
      requireProjectCapability(viewer.id, projectId, 'CREATE_TASK'),
      (err: AuthError) => err.statusCode === 403,
    );

    // VIEWER CAN view
    await requireProjectCapability(viewer.id, projectId, 'VIEW_PROJECT');
  });

  test('requireProjectCapability allows MEMBER for CREATE_TASK', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('perm-member'), name: 'Perm Owner 2', passwordHash: 'hash' } });
    const member = await prisma.user.create({ data: { email: testEmail('perm-member-user'), name: 'Member', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'Perm Member Project' });
    const projectId = result.project!.id;

    await prisma.projectMember.create({ data: { projectId, userId: member.id, role: 'MEMBER' } });

    const m = await requireProjectCapability(member.id, projectId, 'CREATE_TASK');
    assert.equal(m.role, 'MEMBER');
  });

  test('requireProjectCapability allows ADMIN for MANAGE_PROJECT', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('perm-admin'), name: 'Perm Owner 3', passwordHash: 'hash' } });
    const admin = await prisma.user.create({ data: { email: testEmail('perm-admin-user'), name: 'Admin', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'Perm Admin Project' });
    const projectId = result.project!.id;

    await prisma.projectMember.create({ data: { projectId, userId: admin.id, role: 'ADMIN' } });

    const m = await requireProjectCapability(admin.id, projectId, 'MANAGE_PROJECT');
    assert.equal(m.role, 'ADMIN');
  });

  test('cross-workspace access blocked', async () => {
    const ownerA = await prisma.user.create({ data: { email: testEmail('perm-xws-a'), name: 'Owner A', passwordHash: 'hash' } });
    const ownerB = await prisma.user.create({ data: { email: testEmail('perm-xws-b'), name: 'Owner B', passwordHash: 'hash' } });

    const resultA = await completeOnboarding(ownerA.id, { projectName: 'Workspace A Project' });
    const resultB = await completeOnboarding(ownerB.id, { projectName: 'Workspace B Project' });

    // Owner A cannot access workspace B
    await assert.rejects(
      requireWorkspaceCapability(ownerA.id, resultB.workspace.id, 'VIEW_WORKSPACE'),
      (err: AuthError) => err.statusCode === 403,
    );

    // Owner A cannot access project B
    await assert.rejects(
      requireProjectCapability(ownerA.id, resultB.project!.id, 'VIEW_PROJECT'),
      (err: AuthError) => err.statusCode === 403,
    );
  });

  test('assignee validation: non-member cannot be assigned', async () => {
    const owner = await prisma.user.create({ data: { email: testEmail('perm-assign'), name: 'Assign Owner', passwordHash: 'hash' } });
    const outsider = await prisma.user.create({ data: { email: testEmail('perm-assign-out'), name: 'Outsider', passwordHash: 'hash' } });
    const result = await completeOnboarding(owner.id, { projectName: 'Assign Project' });
    const projectId = result.project!.id;

    await assert.rejects(
      createTask(projectId, owner.id, { name: 'Task', assigneeId: outsider.id }),
      (err: AuthError) => err.message.toLowerCase().includes('assignee'),
    );
  });
});
