import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { db } from '@/server/db/client';
import { requireTaskProjectCapability } from '@/server/auth/authorization';
import { createTalentInvitationSchema, replaceTaskCompetenciesSchema } from './task-talent.schemas';
import {
  createTaskTalentInvitation,
  listOwnTalentInvitations,
  listTaskCompetencies,
  replaceTaskCompetencies,
  respondToOwnTalentInvitation,
} from './task-talent.service';

test('competency replacement rejects duplicate skills', () => {
  const parsed = replaceTaskCompetenciesSchema.safeParse({ requirements: [
    { skillId: 'skill-1', minimumProficiency: 'INTERMEDIATE', isRequired: true },
    { skillId: 'skill-1', minimumProficiency: 'ADVANCED', isRequired: false },
  ] });
  assert.equal(parsed.success, false);
});

test('talent invitation validates money, currency, and ISO deadlines', () => {
  const futureDeadline = new Date(Date.now() + 86_400_000).toISOString();
  const pastDeadline = new Date(Date.now() - 86_400_000).toISOString();
  assert.equal(createTalentInvitationSchema.safeParse({ professionalProfileId: 'profile-1', proposedBudget: 500 }).success, false);
  assert.equal(createTalentInvitationSchema.safeParse({ professionalProfileId: 'profile-1', proposedBudget: 500, currency: 'usd', proposedDeadline: futureDeadline }).success, true);
  assert.equal(createTalentInvitationSchema.safeParse({ professionalProfileId: 'profile-1', currency: 'USD' }).success, false);
  assert.equal(createTalentInvitationSchema.safeParse({ professionalProfileId: 'profile-1', proposedDeadline: pastDeadline }).success, false);
  assert.equal(createTalentInvitationSchema.safeParse({ professionalProfileId: 'profile-1', proposedDeadline: '09/01/2026' }).success, false);
});

test('task invitation routes enforce the existing EDIT_TASK capability', () => {
  const createRoute = readFileSync('src/app/api/tasks/[taskId]/talent-invitations/route.ts', 'utf8');
  const withdrawRoute = readFileSync('src/app/api/tasks/[taskId]/talent-invitations/[invitationId]/route.ts', 'utf8');
  const competencyRoute = readFileSync('src/app/api/tasks/[taskId]/competencies/route.ts', 'utf8');
  assert.match(createRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(withdrawRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(competencyRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
});

test('professional responses are owner-scoped and do not grant task or project access', () => {
  const service = readFileSync('src/server/talent/task-talent.service.ts', 'utf8');
  assert.match(service, /professionalProfile: \{ userId \}/);
  assert.doesNotMatch(service, /task\.update\(/);
  assert.doesNotMatch(service, /projectMember\.create\(/);
  assert.doesNotMatch(service, /assigneeId/);
});

test('database prevents concurrent duplicate pending invitations', () => {
  const migration = readFileSync('prisma/migrations/20260821020000_add_task_talent_invitations/migration.sql', 'utf8');
  assert.match(migration, /CREATE UNIQUE INDEX "TalentInvitation_one_pending_per_task_profile"/);
  assert.match(migration, /WHERE "status" = 'PENDING'/);
});

test('Phase 3 lifecycle persists requirements and interest without granting project access', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { email: `talent-manager-${runId}@example.com`, name: 'Talent Manager' } });
  const professional = await db.user.create({ data: { email: `talent-professional-${runId}@example.com`, name: 'Talent Professional' } });
  const outsider = await db.user.create({ data: { email: `talent-outsider-${runId}@example.com`, name: 'Unrelated Professional' } });
  const skill = await db.skill.findFirstOrThrow({ where: { isActive: true }, orderBy: { id: 'asc' } });
  const workspace = await db.workspace.create({ data: { name: 'Phase 3 Test', slug: `phase-3-${runId}`, members: { create: { userId: owner.id, role: 'OWNER' } } } });
  const project = await db.project.create({ data: { name: 'Phase 3 Project', ownerId: owner.id, workspaceId: workspace.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
  const task = await db.task.create({ data: { projectId: project.id, name: 'Hire a specialist', createdById: owner.id } });
  const profile = await db.professionalProfile.create({ data: { userId: professional.id, slug: `phase-3-professional-${runId}`, professionalTitle: 'Backend Engineer', status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' } });
  await db.professionalProfile.create({ data: { userId: outsider.id, slug: `phase-3-outsider-${runId}`, status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' } });

  try {
    await replaceTaskCompetencies(task.id, { requirements: [{ skillId: skill.id, minimumProficiency: 'ADVANCED', isRequired: true }] });
    const requirements = await listTaskCompetencies(task.id);
    assert.equal(requirements.length, 1);
    assert.equal(requirements[0].skill.id, skill.id);

    await requireTaskProjectCapability(owner.id, task.id, 'EDIT_TASK');
    await assert.rejects(
      () => requireTaskProjectCapability(outsider.id, task.id, 'EDIT_TASK'),
      /do not have access to this project/i,
    );

    const invitation = await createTaskTalentInvitation(task.id, owner.id, { professionalProfileId: profile.id, message: 'Interested in this task?', proposedBudget: 1200, currency: 'USD' });
    await assert.rejects(() => createTaskTalentInvitation(task.id, owner.id, { professionalProfileId: profile.id }), /pending invitation already exists/i);
    assert.equal((await listOwnTalentInvitations(professional.id)).length, 1);
    assert.equal((await listOwnTalentInvitations(outsider.id)).length, 0);

    await respondToOwnTalentInvitation(professional.id, invitation.id, 'ACCEPTED');
    await assert.rejects(() => respondToOwnTalentInvitation(professional.id, invitation.id, 'DECLINED'), /can no longer be answered/i);

    const [persistedTask, membership, persistedInvitation] = await Promise.all([
      db.task.findUnique({ where: { id: task.id }, select: { assigneeId: true } }),
      db.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: professional.id } } }),
      db.talentInvitation.findUnique({ where: { id: invitation.id }, select: { status: true } }),
    ]);
    assert.equal(persistedInvitation?.status, 'ACCEPTED');
    assert.equal(persistedTask?.assigneeId, null);
    assert.equal(membership, null);

    const expiredInvitation = await db.talentInvitation.create({
      data: {
        taskId: task.id,
        professionalProfileId: profile.id,
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    await assert.rejects(
      () => respondToOwnTalentInvitation(professional.id, expiredInvitation.id, 'ACCEPTED'),
      /expired/i,
    );
    const persistedExpiry = await db.talentInvitation.findUniqueOrThrow({
      where: { id: expiredInvitation.id },
      select: { status: true },
    });
    assert.equal(persistedExpiry.status, 'EXPIRED');

    const concurrentInvitation = await createTaskTalentInvitation(task.id, owner.id, {
      professionalProfileId: profile.id,
    });
    const concurrentResponses = await Promise.allSettled([
      respondToOwnTalentInvitation(professional.id, concurrentInvitation.id, 'ACCEPTED'),
      respondToOwnTalentInvitation(professional.id, concurrentInvitation.id, 'DECLINED'),
    ]);
    assert.equal(concurrentResponses.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(concurrentResponses.filter((result) => result.status === 'rejected').length, 1);
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, professional.id, outsider.id] } } });
  }
});
