import { Prisma } from '@prisma/client';

export const milestoneSelect = {
  id: true,
  engagementId: true,
  title: true,
  description: true,
  amount: true,
  dueDate: true,
  sortOrder: true,
  status: true,
  submittedAt: true,
  approvedAt: true,
  rejectedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EngagementMilestoneSelect;

export const deliverableSelect = {
  id: true,
  engagementId: true,
  milestoneId: true,
  submittedById: true,
  title: true,
  description: true,
  fileUrl: true,
  externalUrl: true,
  notes: true,
  submittedAt: true,
  submittedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
    },
  },
} satisfies Prisma.EngagementDeliverableSelect;

export const activitySelect = {
  id: true,
  engagementId: true,
  authorId: true,
  type: true,
  description: true,
  metadata: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
    },
  },
} satisfies Prisma.EngagementActivitySelect;

export const engagementListItemSelect = {
  id: true,
  taskId: true,
  opportunityId: true,
  proposalId: true,
  professionalProfileId: true,
  clientUserId: true,
  status: true,
  title: true,
  scopeDescription: true,
  agreedPrice: true,
  currency: true,
  startDate: true,
  deadline: true,
  completedAt: true,
  cancelledAt: true,
  disputedAt: true,
  cancellationReason: true,
  disputeReason: true,
  termsAcceptedAt: true,
  createdAt: true,
  updatedAt: true,
  task: {
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      dueDate: true,
      projectId: true,
    },
  },
  professionalProfile: {
    select: {
      id: true,
      slug: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          avatarColor: true,
        },
      },
    },
  },
  clientUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
    },
  },
  milestones: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      title: true,
      amount: true,
      status: true,
      dueDate: true,
      sortOrder: true,
    },
  },
  _count: {
    select: {
      deliverables: true,
      activities: true,
    },
  },
} satisfies Prisma.EngagementSelect;

export const engagementDetailSelect = {
  id: true,
  taskId: true,
  opportunityId: true,
  proposalId: true,
  professionalProfileId: true,
  clientUserId: true,
  status: true,
  title: true,
  scopeDescription: true,
  agreedPrice: true,
  currency: true,
  startDate: true,
  deadline: true,
  completedAt: true,
  cancelledAt: true,
  disputedAt: true,
  cancellationReason: true,
  disputeReason: true,
  termsAcceptedAt: true,
  createdAt: true,
  updatedAt: true,
  task: {
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      projectId: true,
    },
  },
  opportunity: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  proposal: {
    select: {
      id: true,
      proposedPrice: true,
      currency: true,
      coverMessage: true,
      status: true,
    },
  },
  professionalProfile: {
    select: {
      id: true,
      slug: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          avatarColor: true,
        },
      },
    },
  },
  clientUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
    },
  },
  milestones: {
    orderBy: { sortOrder: 'asc' },
    select: milestoneSelect,
  },
  deliverables: {
    orderBy: { submittedAt: 'desc' },
    select: deliverableSelect,
  },
  activities: {
    orderBy: { createdAt: 'desc' },
    select: activitySelect,
  },
} satisfies Prisma.EngagementSelect;

export function toMilestoneDto(m: Prisma.EngagementMilestoneGetPayload<{ select: typeof milestoneSelect }>) {
  return {
    ...m,
    amount: Number(m.amount),
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    submittedAt: m.submittedAt ? m.submittedAt.toISOString() : null,
    approvedAt: m.approvedAt ? m.approvedAt.toISOString() : null,
    rejectedAt: m.rejectedAt ? m.rejectedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function toDeliverableDto(d: Prisma.EngagementDeliverableGetPayload<{ select: typeof deliverableSelect }>) {
  return {
    ...d,
    submittedAt: d.submittedAt.toISOString(),
  };
}

export function toActivityDto(a: Prisma.EngagementActivityGetPayload<{ select: typeof activitySelect }>) {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
  };
}

export function toEngagementListItemDto(
  engagement: Prisma.EngagementGetPayload<{ select: typeof engagementListItemSelect }>,
  currentUserId?: string,
) {
  const isClient = engagement.clientUserId === currentUserId;
  const isProfessional = engagement.professionalProfile.user.id === currentUserId;

  return {
    id: engagement.id,
    taskId: engagement.taskId,
    opportunityId: engagement.opportunityId,
    proposalId: engagement.proposalId,
    professionalProfileId: engagement.professionalProfileId,
    clientUserId: engagement.clientUserId,
    status: engagement.status,
    title: engagement.title,
    scopeDescription: engagement.scopeDescription,
    agreedPrice: Number(engagement.agreedPrice),
    currency: engagement.currency,
    startDate: engagement.startDate ? engagement.startDate.toISOString() : null,
    deadline: engagement.deadline ? engagement.deadline.toISOString() : null,
    completedAt: engagement.completedAt ? engagement.completedAt.toISOString() : null,
    cancelledAt: engagement.cancelledAt ? engagement.cancelledAt.toISOString() : null,
    disputedAt: engagement.disputedAt ? engagement.disputedAt.toISOString() : null,
    cancellationReason: engagement.cancellationReason,
    disputeReason: engagement.disputeReason,
    termsAcceptedAt: engagement.termsAcceptedAt ? engagement.termsAcceptedAt.toISOString() : null,
    createdAt: engagement.createdAt.toISOString(),
    updatedAt: engagement.updatedAt.toISOString(),
    task: {
      ...engagement.task,
      dueDate: engagement.task.dueDate ? engagement.task.dueDate.toISOString() : null,
    },
    professional: {
      profileId: engagement.professionalProfile.id,
      slug: engagement.professionalProfile.slug,
      userId: engagement.professionalProfile.user.id,
      name: engagement.professionalProfile.user.name ?? 'Professional',
      email: engagement.professionalProfile.user.email,
      avatarUrl: engagement.professionalProfile.user.avatarUrl,
      avatarColor: engagement.professionalProfile.user.avatarColor,
    },
    client: {
      userId: engagement.clientUser.id,
      name: engagement.clientUser.name ?? 'Client',
      email: engagement.clientUser.email,
      avatarUrl: engagement.clientUser.avatarUrl,
      avatarColor: engagement.clientUser.avatarColor,
    },
    milestones: engagement.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      amount: Number(m.amount),
      status: m.status,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      sortOrder: m.sortOrder,
    })),
    deliverablesCount: engagement._count.deliverables,
    activitiesCount: engagement._count.activities,
    viewerRole: isClient ? ('client' as const) : isProfessional ? ('professional' as const) : ('other' as const),
  };
}

export function toEngagementDetailDto(
  engagement: Prisma.EngagementGetPayload<{ select: typeof engagementDetailSelect }>,
  currentUserId?: string,
) {
  const isClient = engagement.clientUserId === currentUserId;
  const isProfessional = engagement.professionalProfile.user.id === currentUserId;

  return {
    id: engagement.id,
    taskId: engagement.taskId,
    opportunityId: engagement.opportunityId,
    proposalId: engagement.proposalId,
    professionalProfileId: engagement.professionalProfileId,
    clientUserId: engagement.clientUserId,
    status: engagement.status,
    title: engagement.title,
    scopeDescription: engagement.scopeDescription,
    agreedPrice: Number(engagement.agreedPrice),
    currency: engagement.currency,
    startDate: engagement.startDate ? engagement.startDate.toISOString() : null,
    deadline: engagement.deadline ? engagement.deadline.toISOString() : null,
    completedAt: engagement.completedAt ? engagement.completedAt.toISOString() : null,
    cancelledAt: engagement.cancelledAt ? engagement.cancelledAt.toISOString() : null,
    disputedAt: engagement.disputedAt ? engagement.disputedAt.toISOString() : null,
    cancellationReason: engagement.cancellationReason,
    disputeReason: engagement.disputeReason,
    termsAcceptedAt: engagement.termsAcceptedAt ? engagement.termsAcceptedAt.toISOString() : null,
    createdAt: engagement.createdAt.toISOString(),
    updatedAt: engagement.updatedAt.toISOString(),
    task: {
      ...engagement.task,
      dueDate: engagement.task.dueDate ? engagement.task.dueDate.toISOString() : null,
    },
    opportunity: engagement.opportunity,
    proposal: engagement.proposal
      ? {
          ...engagement.proposal,
          proposedPrice: Number(engagement.proposal.proposedPrice),
        }
      : null,
    professional: {
      profileId: engagement.professionalProfile.id,
      slug: engagement.professionalProfile.slug,
      userId: engagement.professionalProfile.user.id,
      name: engagement.professionalProfile.user.name ?? 'Professional',
      email: engagement.professionalProfile.user.email,
      avatarUrl: engagement.professionalProfile.user.avatarUrl,
      avatarColor: engagement.professionalProfile.user.avatarColor,
    },
    client: {
      userId: engagement.clientUser.id,
      name: engagement.clientUser.name ?? 'Client',
      email: engagement.clientUser.email,
      avatarUrl: engagement.clientUser.avatarUrl,
      avatarColor: engagement.clientUser.avatarColor,
    },
    milestones: engagement.milestones.map(toMilestoneDto),
    deliverables: engagement.deliverables.map(toDeliverableDto),
    activities: engagement.activities.map(toActivityDto),
    viewerRole: isClient ? ('client' as const) : isProfessional ? ('professional' as const) : ('other' as const),
    canManage: isClient,
    canSubmitDeliverables: (isProfessional && engagement.status === 'ACTIVE') || isClient,
    canAcceptTerms: isProfessional && engagement.status === 'AWAITING_PROFESSIONAL_ACCEPTANCE',
    canSubmitMilestones: isProfessional && engagement.status === 'ACTIVE',
    canReviewMilestones: isClient && engagement.status === 'ACTIVE',
    canSubmitFinalWork: isProfessional && engagement.status === 'ACTIVE',
    canComplete: isClient && (engagement.status === 'ACTIVE' || engagement.status === 'WORK_SUBMITTED'),
    canCancel: ['DRAFT', 'AWAITING_PROFESSIONAL_ACCEPTANCE', 'ACTIVE'].includes(engagement.status),
    canDispute: ['ACTIVE', 'WORK_SUBMITTED'].includes(engagement.status),
  };
}
