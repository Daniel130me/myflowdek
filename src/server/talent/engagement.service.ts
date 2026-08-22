import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import {
  CreateEngagementInput,
  UpdateEngagementInput,
  SendEngagementOfferInput,
  SubmitMilestoneInput,
  ReviewMilestoneInput,
  SubmitDeliverableInput,
  CancelEngagementInput,
  DisputeEngagementInput,
  ListEngagementsQuery,
} from './engagement.schemas';
import {
  engagementDetailSelect,
  engagementListItemSelect,
  toEngagementDetailDto,
  toEngagementListItemDto,
} from './engagement.select';
import { ServiceError } from '@/server/http/errors';
export { ServiceError };

/**
 * Creates a new engagement in DRAFT state.
 */
export async function createDraftEngagement(userId: string, input: CreateEngagementInput) {
  // 1. Verify task access (must be project member with EDIT_TASK capability)
  const task = await db.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      projectId: true,
      project: {
        select: {
          members: { where: { userId }, select: { role: true } },
        },
      },
    },
  });

  if (!task) {
    throw new ServiceError('Task not found.', 404);
  }

  const membership = task.project.members[0];
  if (!membership || !['OWNER', 'ADMIN', 'PROJECT_MANAGER'].includes(membership.role)) {
    throw new ServiceError('You must be a project manager, admin, or owner to create an engagement.', 403);
  }

  // 2. Verify professional profile exists and is active
  const professionalProfile = await db.professionalProfile.findUnique({
    where: { id: input.professionalProfileId },
    select: { id: true, userId: true, status: true },
  });

  if (!professionalProfile) {
    throw new ServiceError('Professional profile not found.', 404);
  }
  if (professionalProfile.userId === userId) {
    throw new ServiceError('You cannot create an engagement with yourself.', 400);
  }

  // 3. Create engagement in transaction
  return db.$transaction(async (tx) => {
    const engagement = await tx.engagement.create({
      data: {
        taskId: input.taskId,
        opportunityId: input.opportunityId,
        proposalId: input.proposalId,
        professionalProfileId: input.professionalProfileId,
        clientUserId: userId,
        status: 'DRAFT',
        title: input.title,
        scopeDescription: input.scopeDescription,
        agreedPrice: new Prisma.Decimal(input.agreedPrice),
        currency: input.currency || 'USD',
        startDate: input.startDate ? new Date(input.startDate) : null,
        deadline: input.deadline ? new Date(input.deadline) : null,
        milestones: input.milestones && input.milestones.length > 0
          ? {
              create: input.milestones.map((m, idx) => ({
                title: m.title,
                description: m.description,
                amount: new Prisma.Decimal(m.amount),
                dueDate: m.dueDate ? new Date(m.dueDate) : null,
                sortOrder: m.sortOrder ?? idx,
                status: 'PENDING',
              })),
            }
          : undefined,
        activities: {
          create: {
            authorId: userId,
            type: 'CREATED',
            description: `Draft engagement created by client.`,
          },
        },
      },
      select: engagementDetailSelect,
    });

    return toEngagementDetailDto(engagement, userId);
  });
}

/**
 * Updates a DRAFT engagement terms.
 */
export async function updateDraftEngagement(userId: string, engagementId: string, input: UpdateEngagementInput) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    select: { id: true, clientUserId: true, status: true },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.clientUserId !== userId) {
    throw new ServiceError('Only the client can update draft engagement terms.', 403);
  }
  if (engagement.status !== 'DRAFT') {
    throw new ServiceError('Only draft engagements can be updated.', 400);
  }

  return db.$transaction(async (tx) => {
    if (input.milestones) {
      await tx.engagementMilestone.deleteMany({
        where: { engagementId },
      });
    }

    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        title: input.title,
        scopeDescription: input.scopeDescription,
        agreedPrice: input.agreedPrice !== undefined ? new Prisma.Decimal(input.agreedPrice) : undefined,
        currency: input.currency,
        startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
        deadline: input.deadline !== undefined ? (input.deadline ? new Date(input.deadline) : null) : undefined,
        milestones: input.milestones
          ? {
              create: input.milestones.map((m, idx) => ({
                title: m.title,
                description: m.description,
                amount: new Prisma.Decimal(m.amount),
                dueDate: m.dueDate ? new Date(m.dueDate) : null,
                sortOrder: m.sortOrder ?? idx,
                status: 'PENDING',
              })),
            }
          : undefined,
      },
      select: engagementDetailSelect,
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Sends the engagement offer to the professional.
 * Status: DRAFT -> AWAITING_PROFESSIONAL_ACCEPTANCE.
 */
export async function sendEngagementOffer(userId: string, engagementId: string, input?: SendEngagementOfferInput) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: {
        select: { userId: true },
      },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.clientUserId !== userId) {
    throw new ServiceError('Only the client can send this engagement offer.', 403);
  }
  if (engagement.status !== 'DRAFT') {
    throw new ServiceError('Only draft engagements can be sent as offers.', 400);
  }

  return db.$transaction(async (tx) => {
    if (input?.milestones) {
      await tx.engagementMilestone.deleteMany({
        where: { engagementId },
      });
    }

    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'AWAITING_PROFESSIONAL_ACCEPTANCE',
        title: input?.title ?? engagement.title,
        scopeDescription: input?.scopeDescription ?? engagement.scopeDescription,
        agreedPrice: input?.agreedPrice !== undefined ? new Prisma.Decimal(input.agreedPrice) : engagement.agreedPrice,
        currency: input?.currency ?? engagement.currency,
        startDate: input?.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : engagement.startDate,
        deadline: input?.deadline !== undefined ? (input.deadline ? new Date(input.deadline) : null) : engagement.deadline,
        milestones: input?.milestones
          ? {
              create: input.milestones.map((m, idx) => ({
                title: m.title,
                description: m.description,
                amount: new Prisma.Decimal(m.amount),
                dueDate: m.dueDate ? new Date(m.dueDate) : null,
                sortOrder: m.sortOrder ?? idx,
                status: 'PENDING',
              })),
            }
          : undefined,
        activities: {
          create: {
            authorId: userId,
            type: 'OFFER_SENT',
            description: `Contract offer sent to professional for review.`,
          },
        },
      },
      select: engagementDetailSelect,
    });

    // Notify professional
    await tx.notification.create({
      data: {
        userId: engagement.professionalProfile.userId,
        actorId: userId,
        type: 'talent_engagement_offer',
        message: `You have received an engagement offer for "${updated.title}".`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Professional accepts the engagement terms and activates the contract.
 * Status: AWAITING_PROFESSIONAL_ACCEPTANCE -> ACTIVE.
 * Grants task-scoped access through the centralized engagement access check.
 */
export async function acceptEngagement(userId: string, engagementId: string) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { id: true, userId: true } },
      task: { select: { id: true, name: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.professionalProfile.userId !== userId) {
    throw new ServiceError('Only the assigned professional can accept this engagement.', 403);
  }
  if (engagement.status !== 'AWAITING_PROFESSIONAL_ACCEPTANCE') {
    throw new ServiceError('This engagement is not awaiting acceptance.', 400);
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    const claimed = await tx.engagement.updateMany({
      where: { id: engagementId, status: 'AWAITING_PROFESSIONAL_ACCEPTANCE' },
      data: {
        status: 'ACTIVE',
        termsAcceptedAt: now,
        startDate: engagement.startDate ?? now,
      },
    });
    if (claimed.count === 0) {
      throw new ServiceError('This engagement is no longer awaiting acceptance.', 409);
    }

    await tx.engagementActivity.create({
      data: {
        engagementId,
        authorId: userId,
        type: 'ACCEPTED',
        description: 'Terms accepted by professional. Engagement is now ACTIVE with scoped task access.',
      },
    });

    // Scoped access is derived from the ACTIVE engagement. The existing task
    // assignee remains untouched because contractors are not project members.
    await tx.notification.create({
      data: {
        userId: engagement.clientUserId,
        actorId: userId,
        type: 'talent_engagement_accepted',
        message: `Professional accepted the engagement for "${engagement.title}".`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'talent_engagement_accepted',
        meta: {
          engagementId: engagement.id,
          taskId: engagement.taskId,
          price: Number(engagement.agreedPrice),
        },
      },
    });

    const updated = await tx.engagement.findUniqueOrThrow({
      where: { id: engagementId },
      select: engagementDetailSelect,
    });
    return toEngagementDetailDto(updated, userId);
  }, { timeout: 15_000 });
}

/**
 * Professional declines the engagement offer.
 * Status: AWAITING_PROFESSIONAL_ACCEPTANCE -> CANCELLED.
 */
export async function declineEngagement(userId: string, engagementId: string, reason?: string) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.professionalProfile.userId !== userId) {
    throw new ServiceError('Only the assigned professional can decline this engagement.', 403);
  }
  if (engagement.status !== 'AWAITING_PROFESSIONAL_ACCEPTANCE') {
    throw new ServiceError('Engagement is not in offer state.', 400);
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason || 'Declined by professional',
        activities: {
          create: {
            authorId: userId,
            type: 'OFFER_DECLINED',
            description: `Offer declined by professional.${reason ? ` Reason: ${reason}` : ''}`,
          },
        },
      },
      select: engagementDetailSelect,
    });

    await tx.notification.create({
      data: {
        userId: engagement.clientUserId,
        actorId: userId,
        type: 'talent_engagement_declined',
        message: `Professional declined the engagement offer for "${engagement.title}".`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Professional submits milestone for client review.
 */
export async function submitMilestone(
  userId: string,
  engagementId: string,
  milestoneId: string,
  input: SubmitMilestoneInput,
) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
      milestones: { where: { id: milestoneId } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.professionalProfile.userId !== userId) {
    throw new ServiceError('Only the professional can submit milestones.', 403);
  }
  if (engagement.status !== 'ACTIVE') {
    throw new ServiceError('Milestones can only be submitted for active engagements.', 400);
  }

  const milestone = engagement.milestones[0];
  if (!milestone) {
    throw new ServiceError('Milestone not found.', 404);
  }
  if (milestone.status === 'APPROVED') {
    throw new ServiceError('This milestone is already approved.', 400);
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    await tx.engagementMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
        rejectionReason: null,
      },
    });

    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        activities: {
          create: {
            authorId: userId,
            type: 'MILESTONE_SUBMITTED',
            description: `Submitted milestone "${milestone.title}" for review.${input.notes ? ` Notes: ${input.notes}` : ''}`,
            metadata: { milestoneId, notes: input.notes },
          },
        },
      },
      select: engagementDetailSelect,
    });

    // Notify client
    await tx.notification.create({
      data: {
        userId: engagement.clientUserId,
        actorId: userId,
        type: 'talent_milestone_submitted',
        message: `Milestone "${milestone.title}" was submitted for review.`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Client approves or requests revision for a submitted milestone.
 */
export async function reviewMilestone(
  userId: string,
  engagementId: string,
  milestoneId: string,
  input: ReviewMilestoneInput,
) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
      milestones: { where: { id: milestoneId } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.clientUserId !== userId) {
    throw new ServiceError('Only the client can review milestones.', 403);
  }

  const milestone = engagement.milestones[0];
  if (!milestone) {
    throw new ServiceError('Milestone not found.', 404);
  }
  if (milestone.status !== 'SUBMITTED' && milestone.status !== 'PENDING') {
    throw new ServiceError('Milestone must be pending or submitted to be reviewed.', 400);
  }

  const now = new Date();
  const isApproval = input.action === 'APPROVE';

  return db.$transaction(async (tx) => {
    await tx.engagementMilestone.update({
      where: { id: milestoneId },
      data: isApproval
        ? {
            status: 'APPROVED',
            approvedAt: now,
            rejectionReason: null,
          }
        : {
            status: 'REJECTED',
            rejectedAt: now,
            rejectionReason: input.rejectionReason || 'Revision requested by client.',
          },
    });

    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        activities: {
          create: {
            authorId: userId,
            type: isApproval ? 'MILESTONE_APPROVED' : 'MILESTONE_REVISION_REQUESTED',
            description: isApproval
              ? `Approved milestone "${milestone.title}".`
              : `Requested revision on milestone "${milestone.title}". ${input.rejectionReason ?? ''}`,
            metadata: { milestoneId, action: input.action, reason: input.rejectionReason },
          },
        },
      },
      select: engagementDetailSelect,
    });

    // Notify professional
    await tx.notification.create({
      data: {
        userId: engagement.professionalProfile.userId,
        actorId: userId,
        type: isApproval ? 'talent_milestone_approved' : 'talent_milestone_revision',
        message: isApproval
          ? `Milestone "${milestone.title}" was approved!`
          : `Revision requested for milestone "${milestone.title}".`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Submits a deliverable item (file or external link) against the engagement.
 */
export async function submitDeliverable(userId: string, engagementId: string, input: SubmitDeliverableInput) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }

  const isClient = engagement.clientUserId === userId;
  const isProfessional = engagement.professionalProfile.userId === userId;

  if (!isClient && !isProfessional) {
    throw new ServiceError('You are not authorized to submit deliverables for this engagement.', 403);
  }

  return db.$transaction(async (tx) => {
    const deliverable = await tx.engagementDeliverable.create({
      data: {
        engagementId,
        milestoneId: input.milestoneId || null,
        submittedById: userId,
        title: input.title,
        description: input.description,
        fileUrl: input.fileUrl || null,
        externalUrl: input.externalUrl || null,
        notes: input.notes,
      },
    });

    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        activities: {
          create: {
            authorId: userId,
            type: 'DELIVERABLE_SUBMITTED',
            description: `Deliverable submitted: "${input.title}".`,
            metadata: { deliverableId: deliverable.id, milestoneId: input.milestoneId },
          },
        },
      },
      select: engagementDetailSelect,
    });

    // Notify other party
    const recipientUserId = isProfessional ? engagement.clientUserId : engagement.professionalProfile.userId;
    await tx.notification.create({
      data: {
        userId: recipientUserId,
        actorId: userId,
        type: 'talent_deliverable_submitted',
        message: `New deliverable "${input.title}" was submitted.`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Professional signals all work has been completed and submitted for review.
 * Status: ACTIVE -> WORK_SUBMITTED.
 */
export async function submitFinalWork(userId: string, engagementId: string, notes?: string) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.professionalProfile.userId !== userId) {
    throw new ServiceError('Only the assigned professional can submit final work.', 403);
  }
  if (engagement.status !== 'ACTIVE') {
    throw new ServiceError('Only active engagements can have work submitted.', 400);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'WORK_SUBMITTED',
        activities: {
          create: {
            authorId: userId,
            type: 'WORK_SUBMITTED',
            description: `Final work submitted for client review.${notes ? ` Notes: ${notes}` : ''}`,
            metadata: { notes },
          },
        },
      },
      select: engagementDetailSelect,
    });

    await tx.notification.create({
      data: {
        userId: engagement.clientUserId,
        actorId: userId,
        type: 'talent_work_submitted',
        message: `Professional submitted all final work for "${engagement.title}".`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Client completes and approves engagement.
 * Status: -> COMPLETED.
 */
export async function completeEngagement(userId: string, engagementId: string) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
      task: { select: { id: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }
  if (engagement.clientUserId !== userId) {
    throw new ServiceError('Only the client can mark the engagement as completed.', 403);
  }
  if (!['ACTIVE', 'WORK_SUBMITTED'].includes(engagement.status)) {
    throw new ServiceError('Only active or submitted engagements can be completed.', 400);
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    // 1. Mark all pending/submitted milestones as APPROVED
    await tx.engagementMilestone.updateMany({
      where: {
        engagementId,
        status: { in: ['PENDING', 'SUBMITTED', 'REJECTED'] },
      },
      data: {
        status: 'APPROVED',
        approvedAt: now,
      },
    });

    // 2. Mark engagement COMPLETED
    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        activities: {
          create: {
            authorId: userId,
            type: 'COMPLETED',
            description: `Engagement successfully completed and approved by client.`,
          },
        },
      },
      select: engagementDetailSelect,
    });

    // 3. Mark task completed / 100% progress
    await tx.task.update({
      where: { id: engagement.taskId },
      data: {
        status: 'done',
        progress: 100,
        completedAt: now,
      },
    });

    // 4. Notify professional
    await tx.notification.create({
      data: {
        userId: engagement.professionalProfile.userId,
        actorId: userId,
        type: 'talent_engagement_completed',
        message: `Engagement for "${engagement.title}" has been approved and completed!`,
      },
    });

    // 5. Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'talent_engagement_completed',
        meta: {
          engagementId: engagement.id,
          taskId: engagement.taskId,
          price: Number(engagement.agreedPrice),
        },
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Cancels the engagement.
 */
export async function cancelEngagement(userId: string, engagementId: string, input: CancelEngagementInput) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }

  const isClient = engagement.clientUserId === userId;
  const isProfessional = engagement.professionalProfile.userId === userId;

  if (!isClient && !isProfessional) {
    throw new ServiceError('Only the client or assigned professional can cancel this engagement.', 403);
  }

  if (['COMPLETED', 'CANCELLED'].includes(engagement.status)) {
    throw new ServiceError('Cannot cancel an engagement that is already completed or cancelled.', 400);
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: input.reason,
        activities: {
          create: {
            authorId: userId,
            type: 'CANCELLED',
            description: `Engagement cancelled by ${isClient ? 'client' : 'professional'}. Reason: ${input.reason}`,
            metadata: { reason: input.reason },
          },
        },
      },
      select: engagementDetailSelect,
    });

    // Notify other party
    const recipientUserId = isClient ? engagement.professionalProfile.userId : engagement.clientUserId;
    await tx.notification.create({
      data: {
        userId: recipientUserId,
        actorId: userId,
        type: 'talent_engagement_cancelled',
        message: `Engagement for "${engagement.title}" was cancelled. Reason: ${input.reason}`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Opens a dispute on an active engagement.
 */
export async function disputeEngagement(userId: string, engagementId: string, input: DisputeEngagementInput) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      professionalProfile: { select: { userId: true } },
    },
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }

  const isClient = engagement.clientUserId === userId;
  const isProfessional = engagement.professionalProfile.userId === userId;

  if (!isClient && !isProfessional) {
    throw new ServiceError('Only parties to the engagement can open a dispute.', 403);
  }

  if (!['ACTIVE', 'WORK_SUBMITTED'].includes(engagement.status)) {
    throw new ServiceError('Only active or submitted engagements can be disputed.', 400);
  }

  const now = new Date();

  return db.$transaction(async (tx) => {
    const updated = await tx.engagement.update({
      where: { id: engagementId },
      data: {
        status: 'DISPUTED',
        disputedAt: now,
        disputeReason: input.reason,
        activities: {
          create: {
            authorId: userId,
            type: 'DISPUTED',
            description: `Dispute opened by ${isClient ? 'client' : 'professional'}. Reason: ${input.reason}`,
            metadata: { reason: input.reason },
          },
        },
      },
      select: engagementDetailSelect,
    });

    // Notify other party
    const recipientUserId = isClient ? engagement.professionalProfile.userId : engagement.clientUserId;
    await tx.notification.create({
      data: {
        userId: recipientUserId,
        actorId: userId,
        type: 'talent_engagement_disputed',
        message: `A dispute has been opened on engagement "${engagement.title}". Reason: ${input.reason}`,
      },
    });

    return toEngagementDetailDto(updated, userId);
  });
}

/**
 * Gets the detail of an engagement.
 */
export async function getEngagementDetail(userId: string, engagementId: string) {
  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    select: engagementDetailSelect,
  });

  if (!engagement) {
    throw new ServiceError('Engagement not found.', 404);
  }

  const isClient = engagement.clientUserId === userId;
  const isProfessional = engagement.professionalProfile.user.id === userId;

  // If not party to engagement, check if project manager of parent project
  if (!isClient && !isProfessional) {
    const projectMember = await db.projectMember.findFirst({
      where: {
        projectId: engagement.task.projectId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!projectMember) {
      throw new ServiceError('You do not have permission to view this engagement.', 403);
    }
  }

  return toEngagementDetailDto(engagement, userId);
}

/**
 * Lists engagements for the current user (as client or professional).
 */
export async function listUserEngagements(userId: string, query: ListEngagementsQuery) {
  const { status, role, search, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  // Resolve user's professional profile id if any
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const roleWhere: Prisma.EngagementWhereInput =
    role === 'client'
      ? { clientUserId: userId }
      : role === 'professional'
        ? profile
          ? { professionalProfileId: profile.id }
          : { id: 'impossible_match' }
        : {
            OR: [
              { clientUserId: userId },
              ...(profile ? [{ professionalProfileId: profile.id }] : []),
            ],
          };

  const statusWhere: Prisma.EngagementWhereInput = status ? { status } : {};

  const searchWhere: Prisma.EngagementWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { scopeDescription: { contains: search, mode: 'insensitive' } },
          { task: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }
    : {};

  const where: Prisma.EngagementWhereInput = {
    AND: [roleWhere, statusWhere, searchWhere],
  };

  const [total, engagements] = await Promise.all([
    db.engagement.count({ where }),
    db.engagement.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
      select: engagementListItemSelect,
    }),
  ]);

  return {
    items: engagements.map((item) => toEngagementListItemDto(item, userId)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
