/**
 * Production integration tests — onboarding idempotency, capability matrix,
 * cross-project integrity, and persistence/refresh.
 *
 * Run with: npm run test
 *
 * These tests hit the real PostgreSQL database and clean up after themselves.
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { completeOnboarding } from '@/server/onboarding/service';
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
  requireProjectMember,
  requireProjectCapability,
  requireWorkspaceCapability,
  AuthError,
} from '@/server/auth/authorization';
import {
  createTask,
  updateTask,
} from '@/server/tasks/task.service';
import {
  addDependency,
} from '@/server/tasks/task-relationships.service';
import { PROJECT_PERMISSIONS, WORKSPACE_PERMISSIONS } from '@/server/auth/capabilities';

const prisma = new PrismaClient();

const RUN_ID = Date.now().toString(36);
function testEmail(local: string): string {
  return `test-${RUN_ID}-${local}@flowdeck.io`;
}

async function deleteUserCascade(userId: string): Promise<void> {
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  });
  for (const ws of workspaces) {
    await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => {});
  }
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

async function cleanupRun(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { contains: `test-${RUN_ID}-` } },
    select: { id: true },
  });
  for (const u of users) {
    await deleteUserCascade(u.id);
  }
}

before(async () => { await cleanupRun(); });
after(async () => { await cleanupRun(); await prisma.$disconnect(); });

/* ===================== ONBOARDING IDEMPOTENCY ===================== */

describe('onboarding idempotency', () => {
  test('first onboarding succeeds and creates workspace + OWNER + preferences', async () => {
    const email = testEmail('idem-ok');
    const user = await prisma.user.create({
      data: { email, name: 'Idem Test', passwordHash: 'hash' },
    });

    assert.equal(user.onboardedAt, null);

    const result = await completeOnboarding(user.id, {
      projectName: 'Idem Project',
      projectColor: '#FE8029',
      projectDesc: 'Test',
      preferences: { defaultView: 'board', enableNotifications: false, theme: 'dark' },
    });

    assert.ok(result.workspace.id);
    assert.ok(result.project?.id);

    // Verify OWNER membership.
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: result.workspace.id, userId: user.id } },
    });
    assert.equal(membership?.role, 'OWNER');

    // Verify preferences were persisted (not discarded).
    const pref = await prisma.workspacePreference.findUnique({
      where: { workspaceId_userId: { workspaceId: result.workspace.id, userId: user.id } },
    });
    assert.ok(pref, 'WorkspacePreference should exist');
    assert.equal(pref?.defaultView, 'board');
    assert.equal(pref?.enableNotifications, false);
    assert.equal(pref?.theme, 'dark');

    // Verify onboardedAt was set.
    const refetched = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { onboardedAt: true },
    });
    assert.ok(refetched.onboardedAt);
  });

  test('second onboarding is rejected with 409', async () => {
    const email = testEmail('idem-dup');
    const user = await prisma.user.create({
      data: { email, name: 'Idem Dup', passwordHash: 'hash' },
    });

    // First onboarding.
    await completeOnboarding(user.id, { projectName: 'First' });

    // Second onboarding should fail.
    await assert.rejects(
      completeOnboarding(user.id, { projectName: 'Second' }),
      (err: AuthError) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /already onboarded/i);
        return true;
      },
    );

    // Verify only one workspace was created.
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
    });
    assert.equal(workspaces.length, 1);
  });

  test('onboarding invitations create Invitation records', async () => {
    const email = testEmail('idem-inv');
    const user = await prisma.user.create({
      data: { email, name: 'Idem Inv', passwordHash: 'hash' },
    });

    await completeOnboarding(user.id, {
      projectName: 'Inv Project',
      invitedMembers: ['invitee1@test.io', 'invitee2@test.io'],
    });

    // Find the workspace.
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    assert.ok(membership);

    const invitations = await prisma.invitation.findMany({
      where: { workspaceId: membership!.workspaceId },
    });
    assert.equal(invitations.length, 2);
    assert.ok(invitations.every(i => i.status === 'PENDING'));
    assert.ok(invitations.some(i => i.email === 'invitee1@test.io'));
    assert.ok(invitations.some(i => i.email === 'invitee2@test.io'));
  });
});

/* ===================== CAPABILITY MATRIX ===================== */

describe('capability matrix enforcement', () => {
  test('VIEWER cannot mutate tasks (CREATE_TASK excludes VIEWER)', () => {
    assert.ok(!PROJECT_PERMISSIONS.CREATE_TASK.includes('VIEWER' as any));
    assert.ok(!PROJECT_PERMISSIONS.EDIT_TASK.includes('VIEWER' as any));
    assert.ok(!PROJECT_PERMISSIONS.DELETE_TASK.includes('VIEWER' as any));
    assert.ok(PROJECT_PERMISSIONS.VIEW_PROJECT.includes('VIEWER' as any));
  });

  test('MEMBER can create/edit tasks but cannot manage project', () => {
    assert.ok(PROJECT_PERMISSIONS.CREATE_TASK.includes('MEMBER' as any));
    assert.ok(PROJECT_PERMISSIONS.EDIT_TASK.includes('MEMBER' as any));
    assert.ok(!PROJECT_PERMISSIONS.MANAGE_PROJECT.includes('MEMBER' as any));
    assert.ok(!PROJECT_PERMISSIONS.DELETE_TASK.includes('MEMBER' as any));
  });

  test('ADMIN can manage project but cannot transfer ownership', () => {
    assert.ok(PROJECT_PERMISSIONS.MANAGE_PROJECT.includes('ADMIN' as any));
    assert.ok(PROJECT_PERMISSIONS.DELETE_TASK.includes('ADMIN' as any));
    assert.ok(!WORKSPACE_PERMISSIONS.TRANSFER_OWNERSHIP.includes('ADMIN' as any));
  });

  test('OWNER has full control', () => {
    assert.ok(WORKSPACE_PERMISSIONS.DELETE_WORKSPACE.includes('OWNER' as any));
    assert.ok(WORKSPACE_PERMISSIONS.TRANSFER_OWNERSHIP.includes('OWNER' as any));
    assert.ok(PROJECT_PERMISSIONS.MANAGE_MEMBERS.includes('OWNER' as any));
  });

  test('requireProjectCapability throws 403 for VIEWER writing', async () => {
    const email = testEmail('cap-viewer');
    const owner = await prisma.user.create({ data: { email, name: 'Owner', passwordHash: 'hash' } });
    const viewer = await prisma.user.create({ data: { email: testEmail('cap-viewer-user'), name: 'Viewer', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Cap Test' });
    const projectId = result.project!.id;

    // Add viewer as VIEWER.
    await prisma.projectMember.create({
      data: { projectId, userId: viewer.id, role: 'VIEWER' },
    });

    await assert.rejects(
      requireProjectCapability(viewer.id, projectId, 'CREATE_TASK'),
      (err: AuthError) => err.statusCode === 403,
    );

    // VIEWER CAN view.
    const m = await requireProjectCapability(viewer.id, projectId, 'VIEW_PROJECT');
    assert.equal(m.role, 'VIEWER');
  });

  test('requireProjectCapability allows MEMBER to create tasks', async () => {
    const email = testEmail('cap-member');
    const owner = await prisma.user.create({ data: { email, name: 'Owner2', passwordHash: 'hash' } });
    const member = await prisma.user.create({ data: { email: testEmail('cap-member-user'), name: 'Member', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Cap Member' });
    const projectId = result.project!.id;

    await prisma.projectMember.create({
      data: { projectId, userId: member.id, role: 'MEMBER' },
    });

    const m = await requireProjectCapability(member.id, projectId, 'CREATE_TASK');
    assert.equal(m.role, 'MEMBER');
  });
});

/* ===================== CROSS-PROJECT INTEGRITY ===================== */

describe('cross-project integrity', () => {
  test('cross-project parent task is rejected', async () => {
    const email = testEmail('xproj-parent');
    const owner = await prisma.user.create({ data: { email, name: 'XProj Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Project A' });
    const projectAId = result.project!.id;

    // Create a second project in the same workspace.
    const projectB = await prisma.project.create({
      data: {
        name: 'Project B',
        ownerId: owner.id,
        workspaceId: result.workspace.id,
      },
    });
    await prisma.projectMember.create({
      data: { projectId: projectB.id, userId: owner.id, role: 'OWNER' },
    });

    // Create a task in project A.
    const taskA = await createTask(projectAId, owner.id, { name: 'Task A' });

    // Try to create a task in project B with parentId from project A — should fail.
    await assert.rejects(
      createTask(projectB.id, owner.id, { name: 'Task B', parentId: taskA.id }),
      (err: AuthError) => {
        assert.match(err.message, /parent.*project/i);
        return true;
      },
    );
  });

  test('cross-project dependency is rejected', async () => {
    const email = testEmail('xproj-dep');
    const owner = await prisma.user.create({ data: { email, name: 'Dep Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Dep A' });
    const projectAId = result.project!.id;

    const projectB = await prisma.project.create({
      data: { name: 'Dep B', ownerId: owner.id, workspaceId: result.workspace.id },
    });
    await prisma.projectMember.create({
      data: { projectId: projectB.id, userId: owner.id, role: 'OWNER' },
    });

    const taskA = await createTask(projectAId, owner.id, { name: 'Dep Task A' });
    const taskB = await createTask(projectB.id, owner.id, { name: 'Dep Task B' });

    // Try to add a dependency from taskB (project B) to taskA (project A) — should fail.
    await assert.rejects(
      addDependency(taskB.id, taskA.id),
      (err: AuthError) => {
        assert.match(err.message, /cross-project/i);
        return true;
      },
    );
  });

  test('circular dependency is rejected', async () => {
    const email = testEmail('circ-dep');
    const owner = await prisma.user.create({ data: { email, name: 'Circ Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Circ Proj' });
    const projectId = result.project!.id;

    const taskA = await createTask(projectId, owner.id, { name: 'Circ A' });
    const taskB = await createTask(projectId, owner.id, { name: 'Circ B' });
    const taskC = await createTask(projectId, owner.id, { name: 'Circ C' });

    // A → B (ok)
    await addDependency(taskA.id, taskB.id);
    // B → C (ok)
    await addDependency(taskB.id, taskC.id);
    // C → A (should fail — creates a cycle: A→B→C→A)
    await assert.rejects(
      addDependency(taskC.id, taskA.id),
      (err: AuthError) => {
        assert.match(err.message, /circular/i);
        return true;
      },
    );
  });

  test('self-parenting is rejected', async () => {
    const email = testEmail('self-parent');
    const owner = await prisma.user.create({ data: { email, name: 'Self Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Self Proj' });
    const projectId = result.project!.id;

    const task = await createTask(projectId, owner.id, { name: 'Self Task' });

    await assert.rejects(
      updateTask(task.id, { parentId: task.id }, owner.id),
      (err: AuthError) => {
        assert.match(err.message, /own parent/i);
        return true;
      },
    );
  });

  test('assignee must be a project member', async () => {
    const email = testEmail('assign-check');
    const owner = await prisma.user.create({ data: { email, name: 'Assign Owner', passwordHash: 'hash' } });
    const nonMember = await prisma.user.create({ data: { email: testEmail('assign-nonmember'), name: 'NonMember', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Assign Proj' });
    const projectId = result.project!.id;

    await assert.rejects(
      createTask(projectId, owner.id, { name: 'Task', assigneeId: nonMember.id }),
      (err: AuthError) => {
        assert.match(err.message, /assignee.*member/i);
        return true;
      },
    );
  });
});

/* ===================== PERSISTENCE / REFRESH ===================== */

describe('persistence and refresh', () => {
  test('task created via service persists in DB', async () => {
    const email = testEmail('persist-create');
    const owner = await prisma.user.create({ data: { email, name: 'Persist Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Persist Proj' });
    const projectId = result.project!.id;

    const task = await createTask(projectId, owner.id, { name: 'Persisted Task' });

    // Re-fetch from DB — the task should still be there.
    const refetched = await prisma.task.findUnique({ where: { id: task.id } });
    assert.ok(refetched);
    assert.equal(refetched!.name, 'Persisted Task');
    assert.equal(refetched!.projectId, projectId);
  });

  test('task update via service persists in DB', async () => {
    const email = testEmail('persist-update');
    const owner = await prisma.user.create({ data: { email, name: 'Update Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Update Proj' });
    const projectId = result.project!.id;

    const task = await createTask(projectId, owner.id, { name: 'Before Update' });
    await updateTask(task.id, { name: 'After Update' }, owner.id);

    const refetched = await prisma.task.findUnique({ where: { id: task.id } });
    assert.equal(refetched!.name, 'After Update');
  });

  test('task deletion via service removes from DB', async () => {
    const email = testEmail('persist-delete');
    const owner = await prisma.user.create({ data: { email, name: 'Delete Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Delete Proj' });
    const projectId = result.project!.id;

    const task = await createTask(projectId, owner.id, { name: 'To Delete' });

    // Delete via the API service.
    const { deleteTask } = await import('@/server/tasks/task.service');
    await deleteTask(task.id);

    const refetched = await prisma.task.findUnique({ where: { id: task.id } });
    assert.equal(refetched, null);
  });

  test('activity is recorded when task is created', async () => {
    const email = testEmail('persist-activity');
    const owner = await prisma.user.create({ data: { email, name: 'Activity Owner', passwordHash: 'hash' } });

    const result = await completeOnboarding(owner.id, { projectName: 'Activity Proj' });
    const projectId = result.project!.id;

    const task = await createTask(projectId, owner.id, { name: 'Activity Task' });

    const activities = await prisma.activityEntry.findMany({
      where: { taskId: task.id },
    });
    assert.ok(activities.length > 0);
    assert.ok(activities.some(a => a.type === 'created'));
  });
});

/* ===================== SESSION VERSION ===================== */

describe('session version', () => {
  test('password reset increments sessionVersion', async () => {
    const email = testEmail('session-ver');
    const user = await prisma.user.create({ data: { email, name: 'Session User', passwordHash: 'hash' } });

    const before = user.sessionVersion;

    // Simulate a password reset by calling the service directly.
    const { resetPassword } = await import('@/server/auth/password-reset.service');

    // Production stores hashToken(rawToken) — never the raw token itself.
    // The test must mirror that: store the SHA-256 hash so resetPassword's
    // internal hashToken(rawToken) lookup matches.
    const rawToken = 'test-reset-token-' + RUN_ID;
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // resetPassword receives the RAW token and hashes it internally.
    await resetPassword(rawToken, 'NewStr0ng!Pass');

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { sessionVersion: true },
    });

    assert.equal(after.sessionVersion, before + 1);
  });
});
