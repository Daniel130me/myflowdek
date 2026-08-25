import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccessTaskAsExternalProfessional } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { acceptEngagement, cancelEngagement, getEngagementDetail } from './engagement.service';

test('accepted engagement grants only scoped task access and preserves the internal assignee', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const client = await db.user.create({ data: { email: `eng-client-${runId}@example.com`, name: 'Engagement Client' } });
  const internalAssignee = await db.user.create({ data: { email: `eng-member-${runId}@example.com`, name: 'Internal Assignee' } });
  const professional = await db.user.create({ data: { email: `eng-pro-${runId}@example.com`, name: 'External Professional' } });
  const profile = await db.professionalProfile.create({
    data: {
      userId: professional.id,
      slug: `eng-pro-${runId}`,
      professionalTitle: 'External Engineer',
      status: 'PUBLISHED',
      visibility: 'FLOWDEK_USERS',
    },
  });
  const workspace = await db.workspace.create({
    data: {
      name: 'Engagement Access Test',
      slug: `eng-access-${runId}`,
      members: {
        create: [
          { userId: client.id, role: 'OWNER' },
          { userId: internalAssignee.id, role: 'MEMBER' },
        ],
      },
    },
  });
  const project = await db.project.create({
    data: {
      name: 'Engagement Access Project',
      ownerId: client.id,
      workspaceId: workspace.id,
      members: {
        create: [
          { userId: client.id, role: 'OWNER' },
          { userId: internalAssignee.id, role: 'MEMBER' },
        ],
      },
    },
  });
  const task = await db.task.create({
    data: {
      projectId: project.id,
      name: 'Scoped external task',
      createdById: client.id,
      assigneeId: internalAssignee.id,
    },
  });
  const engagement = await db.engagement.create({
    data: {
      taskId: task.id,
      professionalProfileId: profile.id,
      clientUserId: client.id,
      status: 'AWAITING_PROFESSIONAL_ACCEPTANCE',
      title: 'Scoped contract',
      scopeDescription: 'Complete only the explicitly contracted task scope.',
      agreedPrice: 100_000,
      currency: 'NGN',
    },
  });

  try {
    assert.equal(await canAccessTaskAsExternalProfessional(professional.id, task.id), false);

    const accepted = await acceptEngagement(professional.id, engagement.id);
    assert.equal(accepted.status, 'ACTIVE');
    assert.equal(await canAccessTaskAsExternalProfessional(professional.id, task.id), true);

    const persistedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
      select: { assigneeId: true },
    });
    assert.equal(persistedTask.assigneeId, internalAssignee.id);
    assert.equal(
      await db.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: professional.id } },
      }),
      null,
    );

    const detail = await getEngagementDetail(professional.id, engagement.id);
    assert.equal(detail.id, engagement.id);

    await cancelEngagement(professional.id, engagement.id, { reason: 'Contract ended during access test.' });
    assert.equal(await canAccessTaskAsExternalProfessional(professional.id, task.id), false);
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [client.id, internalAssignee.id, professional.id] } } });
  }
});
