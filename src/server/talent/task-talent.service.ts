import { Prisma, TalentInvitationStatus } from '@prisma/client';

import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import type { CreateTalentInvitationInput, ReplaceTaskCompetenciesInput } from './task-talent.schemas';

const DEFAULT_INVITATION_LIFETIME_DAYS = 14;

const requirementSelect = {
  id: true,
  minimumProficiency: true,
  isRequired: true,
  notes: true,
  skill: { select: { id: true, slug: true, name: true, category: true } },
} satisfies Prisma.TaskCompetencyRequirementSelect;

export async function listTaskCompetencies(taskId: string) {
  return db.taskCompetencyRequirement.findMany({
    where: { taskId },
    orderBy: [{ isRequired: 'desc' }, { skill: { sortOrder: 'asc' } }],
    select: requirementSelect,
  });
}

export async function replaceTaskCompetencies(taskId: string, input: ReplaceTaskCompetenciesInput) {
  const skillIds = input.requirements.map((requirement) => requirement.skillId);
  const activeSkillCount = await db.skill.count({ where: { id: { in: skillIds }, isActive: true } });
  if (activeSkillCount !== skillIds.length) throw new ServiceError('One or more selected skills are unavailable.', 400);

  const replacement = input.requirements.map((requirement) => ({
    taskId,
    skillId: requirement.skillId,
    minimumProficiency: requirement.minimumProficiency,
    isRequired: requirement.isRequired,
    notes: requirement.notes || null,
  }));
  // A batch transaction avoids holding an interactive transaction open over
  // a high-latency serverless database connection.
  await db.$transaction([
    db.taskCompetencyRequirement.deleteMany({ where: { taskId } }),
    ...(replacement.length > 0 ? [db.taskCompetencyRequirement.createMany({ data: replacement })] : []),
  ]);

  return listTaskCompetencies(taskId);
}

export async function createTaskTalentInvitation(taskId: string, invitedById: string, input: CreateTalentInvitationInput) {
  const profile = await db.professionalProfile.findFirst({
    where: { id: input.professionalProfileId, status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' },
    select: { id: true, userId: true },
  });
  if (!profile) throw new ServiceError('Published professional profile was not found.', 404);
  if (profile.userId === invitedById) throw new ServiceError('You cannot invite your own professional profile.', 400);

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + DEFAULT_INVITATION_LIFETIME_DAYS);

  return db.$transaction(async (transaction) => {
    await transaction.talentInvitation.updateMany({
      where: { taskId, professionalProfileId: profile.id, status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
    const existing = await transaction.talentInvitation.findFirst({
      where: { taskId, professionalProfileId: profile.id, status: 'PENDING' },
      select: { id: true },
    });
    if (existing) throw new ServiceError('A pending invitation already exists for this professional and task.', 409);

    const invitation = await transaction.talentInvitation.create({
      data: {
        taskId,
        professionalProfileId: profile.id,
        invitedById,
        message: input.message || null,
        proposedBudget: input.proposedBudget == null ? null : new Prisma.Decimal(input.proposedBudget),
        currency: input.currency ?? null,
        proposedDeadline: input.proposedDeadline ?? null,
        expiresAt,
      },
      select: taskInvitationSelect,
    });

    await Promise.all([
      transaction.notification.create({ data: { userId: profile.userId, actorId: invitedById, taskId, type: 'talent_invitation', message: 'You received a professional invitation for a Flowdek task.' } }),
      transaction.auditLog.create({ data: { userId: invitedById, action: 'talent_invitation_created', meta: { invitationId: invitation.id, taskId, professionalProfileId: profile.id } } }),
    ]);
    return toTaskInvitationDto(invitation);
  });
}

const taskInvitationSelect = {
  id: true,
  message: true,
  proposedBudget: true,
  currency: true,
  proposedDeadline: true,
  status: true,
  expiresAt: true,
  respondedAt: true,
  createdAt: true,
  professionalProfile: {
    select: {
      id: true,
      slug: true,
      professionalTitle: true,
      user: { select: { name: true, avatarColor: true } },
    },
  },
} satisfies Prisma.TalentInvitationSelect;

type TaskInvitationRecord = Prisma.TalentInvitationGetPayload<{ select: typeof taskInvitationSelect }>;

function toTaskInvitationDto(invitation: TaskInvitationRecord) {
  return {
    ...invitation,
    proposedBudget: invitation.proposedBudget?.toString() ?? null,
    proposedDeadline: invitation.proposedDeadline?.toISOString() ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    professional: {
      id: invitation.professionalProfile.id,
      slug: invitation.professionalProfile.slug,
      displayName: invitation.professionalProfile.user.name ?? 'Flowdek Professional',
      avatarColor: invitation.professionalProfile.user.avatarColor,
      professionalTitle: invitation.professionalProfile.professionalTitle,
    },
    professionalProfile: undefined,
  };
}

export async function listTaskTalentInvitations(taskId: string) {
  await db.talentInvitation.updateMany({ where: { taskId, status: 'PENDING', expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED' } });
  const invitations = await db.talentInvitation.findMany({ where: { taskId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: taskInvitationSelect });
  return invitations.map(toTaskInvitationDto);
}

export async function withdrawTaskTalentInvitation(taskId: string, invitationId: string, userId: string) {
  const result = await db.$transaction(async (transaction) => {
    const updated = await transaction.talentInvitation.updateMany({ where: { id: invitationId, taskId, status: 'PENDING' }, data: { status: 'WITHDRAWN', respondedAt: new Date() } });
    if (updated.count === 0) throw new ServiceError('Only a pending invitation can be withdrawn.', 409);
    await transaction.auditLog.create({ data: { userId, action: 'talent_invitation_withdrawn', meta: { invitationId, taskId } } });
    return { ok: true };
  });
  return result;
}

const professionalInvitationSelect = {
  id: true,
  message: true,
  proposedBudget: true,
  currency: true,
  proposedDeadline: true,
  status: true,
  expiresAt: true,
  respondedAt: true,
  createdAt: true,
  task: { select: { id: true, name: true } },
  invitedBy: { select: { name: true } },
} satisfies Prisma.TalentInvitationSelect;

export async function listOwnTalentInvitations(userId: string) {
  const profile = await db.professionalProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return [];

  await db.talentInvitation.updateMany({ where: { professionalProfileId: profile.id, status: 'PENDING', expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED' } });
  const invitations = await db.talentInvitation.findMany({ where: { professionalProfileId: profile.id }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: professionalInvitationSelect });
  return invitations.map((invitation) => ({
    ...invitation,
    proposedBudget: invitation.proposedBudget?.toString() ?? null,
    proposedDeadline: invitation.proposedDeadline?.toISOString() ?? null,
    expiresAt: invitation.expiresAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  }));
}

export async function respondToOwnTalentInvitation(userId: string, invitationId: string, status: Extract<TalentInvitationStatus, 'ACCEPTED' | 'DECLINED'>) {
  return db.$transaction(async (transaction) => {
    const invitation = await transaction.talentInvitation.findFirst({
      where: { id: invitationId, professionalProfile: { userId } },
      select: { id: true, taskId: true, status: true, expiresAt: true },
    });
    if (!invitation) throw new ServiceError('Invitation was not found.', 404);
    if (invitation.status !== 'PENDING') throw new ServiceError('This invitation can no longer be answered.', 409);
    if (invitation.expiresAt <= new Date()) {
      await transaction.talentInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new ServiceError('This invitation has expired.', 409);
    }

    const respondedAt = new Date();
    await transaction.talentInvitation.update({ where: { id: invitation.id }, data: { status, respondedAt } });
    await transaction.auditLog.create({ data: { userId, action: status === 'ACCEPTED' ? 'talent_invitation_accepted' : 'talent_invitation_declined', meta: { invitationId, taskId: invitation.taskId } } });
    return { id: invitation.id, status, respondedAt: respondedAt.toISOString() };
  });
}
