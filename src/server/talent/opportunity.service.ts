import { Prisma } from '@prisma/client';

import { audit } from '@/server/audit/log';
import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import type {
  CreateTalentProposalInput,
  OpportunityDirectorySort,
  UpdateTalentProposalInput,
  UpsertTalentOpportunityInput,
} from './opportunity.schemas';
import {
  proposalDetailSelect,
  publicOpportunitySelect,
  toProposalDto,
  toPublicOpportunityDto,
  type ProposalDetailRecord,
} from './opportunity.select';

export interface OpportunityDirectoryFilters {
  search?: string;
  roleId?: string;
  skillIds?: string[];
  budgetType?: string;
  minimumBudget?: number;
  maximumBudget?: number;
  expectedDuration?: string;
  sort?: OpportunityDirectorySort;
  page?: number;
  limit?: number;
}

/**
 * Validates selected skill requirements against active database skills.
 */
async function validateOpportunitySkills(skillIds: string[]): Promise<void> {
  if (skillIds.length === 0) return;
  const count = await db.skill.count({
    where: { id: { in: skillIds }, isActive: true },
  });
  if (count !== skillIds.length) {
    throw new ServiceError('One or more selected skills are unavailable.', 400);
  }
}

/**
 * Retrieve opportunity for a specific task (manager view).
 */
export async function getTaskOpportunity(taskId: string) {
  const opportunity = await db.talentOpportunity.findFirst({
    where: { taskId },
    select: publicOpportunitySelect,
  });
  return opportunity ? toPublicOpportunityDto(opportunity) : null;
}

/**
 * Create or update draft opportunity for a task.
 */
export async function upsertTaskOpportunity(
  taskId: string,
  userId: string,
  input: UpsertTalentOpportunityInput,
) {
  const skillsList = input.requiredSkills ?? [];
  const skillIds = skillsList.map((s) => s.skillId);
  await validateOpportunitySkills(skillIds);

  const minBudget = input.minimumBudget ? new Prisma.Decimal(input.minimumBudget) : null;
  const maxBudget = input.maximumBudget ? new Prisma.Decimal(input.maximumBudget) : null;
  const deadline = input.applicationDeadline ? new Date(input.applicationDeadline) : null;

  const existing = await db.talentOpportunity.findFirst({
    where: { taskId },
    select: { id: true, status: true },
  });

  if (existing && existing.status === 'AWARDED') {
    throw new ServiceError('Cannot modify an opportunity that has already been awarded.', 400);
  }

  const opportunity = await db.$transaction(async (tx) => {
    let oppId: string;

    if (existing) {
      const updated = await tx.talentOpportunity.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description,
          deliverablesSummary: input.deliverablesSummary || null,
          budgetType: input.budgetType as any,
          minimumBudget: minBudget,
          maximumBudget: maxBudget,
          currency: input.currency ?? 'USD',
          expectedDuration: input.expectedDuration || null,
          applicationDeadline: deadline,
          requiredSkills: {
            deleteMany: {},
            createMany: {
              data: skillsList.map((s) => ({
                skillId: s.skillId,
                minimumProficiency: s.minimumProficiency,
                isRequired: s.isRequired,
                notes: s.notes || null,
              })),
            },
          },
        },
        select: { id: true },
      });
      oppId = updated.id;
    } else {
      const created = await tx.talentOpportunity.create({
        data: {
          taskId,
          createdById: userId,
          status: 'DRAFT',
          title: input.title,
          description: input.description,
          deliverablesSummary: input.deliverablesSummary || null,
          budgetType: input.budgetType as any,
          minimumBudget: minBudget,
          maximumBudget: maxBudget,
          currency: input.currency ?? 'USD',
          expectedDuration: input.expectedDuration || null,
          applicationDeadline: deadline,
          requiredSkills: {
            createMany: {
              data: skillsList.map((s) => ({
                skillId: s.skillId,
                minimumProficiency: s.minimumProficiency,
                isRequired: s.isRequired,
                notes: s.notes || null,
              })),
            },
          },
        },
        select: { id: true },
      });
      oppId = created.id;
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: existing ? 'talent_opportunity_updated' : 'talent_opportunity_created',
        meta: { opportunityId: oppId, taskId },
      },
    });

    const full = await tx.talentOpportunity.findUniqueOrThrow({
      where: { id: oppId },
      select: publicOpportunitySelect,
    });
    return toPublicOpportunityDto(full);
  });

  return opportunity;
}

/**
 * Validate completeness and publish opportunity.
 */
export async function publishTaskOpportunity(taskId: string, userId: string) {
  const opportunity = await db.talentOpportunity.findFirst({
    where: { taskId },
    include: { requiredSkills: true },
  });

  if (!opportunity) {
    throw new ServiceError('Opportunity draft was not found for this task.', 404);
  }

  if (opportunity.status === 'AWARDED' || opportunity.status === 'CANCELLED') {
    throw new ServiceError(`Cannot publish an opportunity with status ${opportunity.status}.`, 400);
  }

  // Completeness validations
  if (!opportunity.title || opportunity.title.trim().length < 3) {
    throw new ServiceError('Opportunity must have a title of at least 3 characters.', 400);
  }
  if (!opportunity.description || opportunity.description.trim().length < 20) {
    throw new ServiceError('Opportunity must have a description of at least 20 characters.', 400);
  }
  if (opportunity.requiredSkills.length === 0) {
    throw new ServiceError('Opportunity must require at least one skill.', 400);
  }
  if (opportunity.applicationDeadline && opportunity.applicationDeadline <= new Date()) {
    throw new ServiceError('Application deadline must be in the future.', 400);
  }

  const updated = await db.talentOpportunity.update({
    where: { id: opportunity.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
    select: publicOpportunitySelect,
  });

  await audit({
    userId,
    action: 'talent_opportunity_published',
    meta: { opportunityId: updated.id, taskId },
  });

  return toPublicOpportunityDto(updated);
}

/**
 * Unpublish opportunity back to draft.
 */
export async function unpublishTaskOpportunity(taskId: string, userId: string) {
  const opportunity = await db.talentOpportunity.findFirst({
    where: { taskId },
    select: { id: true, status: true },
  });

  if (!opportunity) throw new ServiceError('Opportunity was not found.', 404);
  if (opportunity.status !== 'PUBLISHED') {
    throw new ServiceError('Only published opportunities can be unpublished.', 400);
  }

  const updated = await db.talentOpportunity.update({
    where: { id: opportunity.id },
    data: { status: 'DRAFT' },
    select: publicOpportunitySelect,
  });

  await audit({
    userId,
    action: 'talent_opportunity_unpublished',
    meta: { opportunityId: updated.id, taskId },
  });

  return toPublicOpportunityDto(updated);
}

/**
 * Close opportunity (no more applications accepted).
 */
export async function closeTaskOpportunity(taskId: string, userId: string) {
  const opportunity = await db.talentOpportunity.findFirst({
    where: { taskId },
    select: { id: true, status: true },
  });

  if (!opportunity) throw new ServiceError('Opportunity was not found.', 404);

  const updated = await db.talentOpportunity.update({
    where: { id: opportunity.id },
    data: { status: 'CLOSED', closedAt: new Date() },
    select: publicOpportunitySelect,
  });

  await audit({
    userId,
    action: 'talent_opportunity_closed',
    meta: { opportunityId: updated.id, taskId },
  });

  return toPublicOpportunityDto(updated);
}

/**
 * Cancel opportunity.
 */
export async function cancelTaskOpportunity(taskId: string, userId: string) {
  const opportunity = await db.talentOpportunity.findFirst({
    where: { taskId },
    select: { id: true, status: true },
  });

  if (!opportunity) throw new ServiceError('Opportunity was not found.', 404);

  const updated = await db.$transaction(async (tx) => {
    const opp = await tx.talentOpportunity.update({
      where: { id: opportunity.id },
      data: { status: 'CANCELLED', closedAt: new Date() },
      select: publicOpportunitySelect,
    });

    // Mark any active submitted or shortlisted proposals as REJECTED
    await tx.talentProposal.updateMany({
      where: {
        opportunityId: opportunity.id,
        status: { in: ['SUBMITTED', 'SHORTLISTED'] },
      },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'talent_opportunity_cancelled',
        meta: { opportunityId: opp.id, taskId },
      },
    });

    return opp;
  });

  return toPublicOpportunityDto(updated);
}

/**
 * List published opportunities for talent marketplace.
 */
export async function listPublishedOpportunities(filters: OpportunityDirectoryFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
  const skip = (page - 1) * limit;

  const where: Prisma.TalentOpportunityWhereInput = {
    status: 'PUBLISHED',
  };

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { deliverablesSummary: { contains: query, mode: 'insensitive' } },
      { requiredSkills: { some: { skill: { name: { contains: query, mode: 'insensitive' } } } } },
    ];
  }

  if (filters.skillIds && filters.skillIds.length > 0) {
    where.requiredSkills = {
      some: {
        skillId: { in: filters.skillIds },
      },
    };
  }

  if (filters.budgetType) {
    where.budgetType = filters.budgetType as any;
  }

  if (filters.minimumBudget != null) {
    where.maximumBudget = { gte: new Prisma.Decimal(filters.minimumBudget) };
  }
  if (filters.maximumBudget != null) {
    where.minimumBudget = { lte: new Prisma.Decimal(filters.maximumBudget) };
  }

  let orderBy: Prisma.TalentOpportunityOrderByWithRelationInput[] = [
    { publishedAt: 'desc' },
    { id: 'desc' },
  ];

  if (filters.sort === 'BUDGET_HIGH_TO_LOW') {
    orderBy = [{ maximumBudget: 'desc' }, { publishedAt: 'desc' }];
  } else if (filters.sort === 'BUDGET_LOW_TO_HIGH') {
    orderBy = [{ minimumBudget: 'asc' }, { publishedAt: 'desc' }];
  } else if (filters.sort === 'DEADLINE_SOONEST') {
    orderBy = [{ applicationDeadline: 'asc' }, { publishedAt: 'desc' }];
  }

  const [total, records] = await Promise.all([
    db.talentOpportunity.count({ where }),
    db.talentOpportunity.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: publicOpportunitySelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    opportunities: records.map(toPublicOpportunityDto),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
  };
}

/**
 * Get public opportunity detail by ID.
 */
export async function getOpportunityById(opportunityId: string, currentUserId?: string) {
  const opportunity = await db.talentOpportunity.findUnique({
    where: { id: opportunityId },
    select: publicOpportunitySelect,
  });

  if (!opportunity) throw new ServiceError('Opportunity was not found.', 404);

  // If not published, only creator can view
  if (opportunity.status !== 'PUBLISHED' && opportunity.createdBy.id !== currentUserId) {
    throw new ServiceError('Opportunity was not found or is not published.', 404);
  }

  return toPublicOpportunityDto(opportunity);
}

/**
 * Submit a proposal for an opportunity.
 */
export async function submitTalentProposal(
  opportunityId: string,
  userId: string,
  input: CreateTalentProposalInput,
) {
  // 1. User must have a published professional profile
  const profile = await db.professionalProfile.findFirst({
    where: { userId, status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' },
    select: { id: true, userId: true },
  });
  if (!profile) {
    throw new ServiceError('You must publish your professional profile before submitting proposals.', 403);
  }

  // 2. Opportunity must exist, be PUBLISHED, and not expired
  const opportunity = await db.talentOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      createdById: true,
      status: true,
      applicationDeadline: true,
      title: true,
    },
  });

  if (!opportunity || opportunity.status !== 'PUBLISHED') {
    throw new ServiceError('This opportunity is not accepting proposals.', 400);
  }

  if (opportunity.createdById === userId) {
    throw new ServiceError('You cannot submit a proposal to your own opportunity.', 400);
  }

  if (opportunity.applicationDeadline && opportunity.applicationDeadline <= new Date()) {
    throw new ServiceError('The application deadline for this opportunity has passed.', 400);
  }

  return db.$transaction(async (tx) => {
    // Check if user already submitted a proposal
    const existing = await tx.talentProposal.findFirst({
      where: {
        opportunityId,
        professionalProfileId: profile.id,
      },
      select: { id: true, status: true },
    });

    if (existing && existing.status !== 'WITHDRAWN') {
      throw new ServiceError('You already have an active proposal submitted for this opportunity.', 409);
    }

    let proposalRecord: ProposalDetailRecord;
    if (existing && existing.status === 'WITHDRAWN') {
      proposalRecord = await tx.talentProposal.update({
        where: { id: existing.id },
        data: {
          proposedPrice: new Prisma.Decimal(input.proposedPrice),
          currency: input.currency ?? 'USD',
          estimatedDuration: input.estimatedDuration,
          coverMessage: input.coverMessage,
          proposedApproach: input.proposedApproach || null,
          milestoneSuggestions: input.milestoneSuggestions ?? Prisma.JsonNull,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          reviewedAt: null,
          respondedAt: null,
        },
        select: proposalDetailSelect,
      });
    } else {
      proposalRecord = await tx.talentProposal.create({
        data: {
          opportunityId,
          professionalProfileId: profile.id,
          proposedPrice: new Prisma.Decimal(input.proposedPrice),
          currency: input.currency ?? 'USD',
          estimatedDuration: input.estimatedDuration,
          coverMessage: input.coverMessage,
          proposedApproach: input.proposedApproach || null,
          milestoneSuggestions: input.milestoneSuggestions ?? Prisma.JsonNull,
          status: 'SUBMITTED',
        },
        select: proposalDetailSelect,
      });
    }

    await Promise.all([
      tx.notification.create({
        data: {
          userId: opportunity.createdById,
          actorId: userId,
          type: 'talent_proposal',
          message: `New proposal received for "${opportunity.title}".`,
        },
      }),
      tx.auditLog.create({
        data: {
          userId,
          action: 'talent_proposal_submitted',
          meta: { proposalId: proposalRecord.id, opportunityId },
        },
      }),
    ]);

    return toProposalDto(proposalRecord);
  });
}

/**
 * Update an existing submitted proposal (author only).
 */
export async function updateTalentProposal(
  proposalId: string,
  userId: string,
  input: UpdateTalentProposalInput,
) {
  const proposal = await db.talentProposal.findFirst({
    where: {
      id: proposalId,
      professionalProfile: { userId },
    },
    include: {
      opportunity: { select: { status: true, applicationDeadline: true } },
    },
  });

  if (!proposal) throw new ServiceError('Proposal was not found.', 404);
  if (proposal.status !== 'SUBMITTED') {
    throw new ServiceError('Only submitted proposals can be edited.', 400);
  }
  if (proposal.opportunity.status !== 'PUBLISHED') {
    throw new ServiceError('Opportunity is no longer published.', 400);
  }

  const updated = await db.talentProposal.update({
    where: { id: proposal.id },
    data: {
      proposedPrice: input.proposedPrice ? new Prisma.Decimal(input.proposedPrice) : undefined,
      currency: input.currency,
      estimatedDuration: input.estimatedDuration,
      coverMessage: input.coverMessage,
      proposedApproach: input.proposedApproach === undefined ? undefined : input.proposedApproach || null,
      milestoneSuggestions: input.milestoneSuggestions === undefined ? undefined : input.milestoneSuggestions ?? Prisma.JsonNull,
    },
    select: proposalDetailSelect,
  });

  await audit({
    userId,
    action: 'talent_proposal_updated',
    meta: { proposalId: updated.id, opportunityId: updated.opportunityId },
  });

  return toProposalDto(updated);
}

/**
 * Withdraw a proposal (author only).
 */
export async function withdrawTalentProposal(proposalId: string, userId: string) {
  const proposal = await db.talentProposal.findFirst({
    where: {
      id: proposalId,
      professionalProfile: { userId },
    },
    select: { id: true, opportunityId: true, status: true },
  });

  if (!proposal) throw new ServiceError('Proposal was not found.', 404);
  if (proposal.status !== 'SUBMITTED' && proposal.status !== 'SHORTLISTED') {
    throw new ServiceError('Only submitted or shortlisted proposals can be withdrawn.', 400);
  }

  const updated = await db.talentProposal.update({
    where: { id: proposal.id },
    data: { status: 'WITHDRAWN', respondedAt: new Date() },
    select: proposalDetailSelect,
  });

  await audit({
    userId,
    action: 'talent_proposal_withdrawn',
    meta: { proposalId: updated.id, opportunityId: updated.opportunityId },
  });

  return toProposalDto(updated);
}

/**
 * Shortlist a proposal (manager only).
 */
export async function shortlistTalentProposal(proposalId: string, managerUserId: string) {
  const proposal = await db.talentProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, opportunityId: true, status: true },
  });

  if (!proposal) throw new ServiceError('Proposal was not found.', 404);
  if (proposal.status !== 'SUBMITTED') {
    throw new ServiceError('Only submitted proposals can be shortlisted.', 400);
  }

  const updated = await db.talentProposal.update({
    where: { id: proposal.id },
    data: { status: 'SHORTLISTED', reviewedAt: new Date() },
    select: proposalDetailSelect,
  });

  await audit({
    userId: managerUserId,
    action: 'talent_proposal_shortlisted',
    meta: { proposalId: updated.id, opportunityId: updated.opportunityId },
  });

  return toProposalDto(updated);
}

/**
 * Reject a proposal (manager only).
 */
export async function rejectTalentProposal(proposalId: string, managerUserId: string) {
  const proposal = await db.talentProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, opportunityId: true, status: true },
  });

  if (!proposal) throw new ServiceError('Proposal was not found.', 404);
  if (proposal.status === 'ACCEPTED' || proposal.status === 'WITHDRAWN') {
    throw new ServiceError(`Cannot reject a proposal with status ${proposal.status}.`, 400);
  }

  const updated = await db.talentProposal.update({
    where: { id: proposal.id },
    data: { status: 'REJECTED', respondedAt: new Date() },
    select: proposalDetailSelect,
  });

  await audit({
    userId: managerUserId,
    action: 'talent_proposal_rejected',
    meta: { proposalId: updated.id, opportunityId: updated.opportunityId },
  });

  return toProposalDto(updated);
}

/**
 * Accept a proposal (manager only).
 * Atomic transaction:
 * 1. Mark chosen proposal ACCEPTED.
 * 2. Mark other active proposals REJECTED.
 * 3. Mark opportunity AWARDED.
 * 4. Audit & notification.
 */
export async function acceptTalentProposal(proposalId: string, managerUserId: string) {
  return db.$transaction(async (tx) => {
    const proposal = await tx.talentProposal.findUnique({
      where: { id: proposalId },
      include: {
        opportunity: { select: { id: true, title: true, status: true, taskId: true } },
        professionalProfile: { select: { userId: true, user: { select: { name: true } } } },
      },
    });

    if (!proposal) throw new ServiceError('Proposal was not found.', 404);
    if (proposal.status !== 'SUBMITTED' && proposal.status !== 'SHORTLISTED') {
      throw new ServiceError(`Cannot accept a proposal with status ${proposal.status}.`, 400);
    }
    if (proposal.opportunity.status !== 'PUBLISHED') {
      throw new ServiceError('Opportunity is not published or has already been awarded.', 400);
    }

    const respondedAt = new Date();

    // 1. Mark chosen proposal ACCEPTED
    const acceptedProposal = await tx.talentProposal.update({
      where: { id: proposal.id },
      data: { status: 'ACCEPTED', respondedAt },
      select: proposalDetailSelect,
    });

    // 2. Reject other active proposals
    await tx.talentProposal.updateMany({
      where: {
        opportunityId: proposal.opportunityId,
        id: { not: proposal.id },
        status: { in: ['SUBMITTED', 'SHORTLISTED'] },
      },
      data: { status: 'REJECTED', respondedAt },
    });

    // 3. Mark opportunity AWARDED
    await tx.talentOpportunity.update({
      where: { id: proposal.opportunityId },
      data: { status: 'AWARDED', closedAt: respondedAt },
    });

    // 4. Audit & notifications
    await Promise.all([
      tx.notification.create({
        data: {
          userId: proposal.professionalProfile.userId,
          actorId: managerUserId,
          type: 'talent_proposal_accepted',
          message: `Your proposal for "${proposal.opportunity.title}" was accepted!`,
        },
      }),
      tx.auditLog.create({
        data: {
          userId: managerUserId,
          action: 'talent_proposal_accepted',
          meta: {
            proposalId: proposal.id,
            opportunityId: proposal.opportunityId,
            taskId: proposal.opportunity.taskId,
          },
        },
      }),
    ]);

    return toProposalDto(acceptedProposal);
  });
}

/**
 * List proposals for an opportunity (manager view).
 */
export async function listProposalsForOpportunity(opportunityId: string) {
  const records = await db.talentProposal.findMany({
    where: { opportunityId },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: proposalDetailSelect,
  });
  return records.map(toProposalDto);
}

/**
 * List proposals submitted by the current user's professional profile.
 */
export async function listOwnProposals(userId: string) {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return [];

  const records = await db.talentProposal.findMany({
    where: { professionalProfileId: profile.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          status: true,
          budgetType: true,
          minimumBudget: true,
          maximumBudget: true,
          currency: true,
          applicationDeadline: true,
        },
      },
      professionalProfile: {
        select: {
          id: true,
          slug: true,
          professionalTitle: true,
          location: true,
          timezone: true,
          remotePreference: true,
          user: { select: { id: true, name: true, avatarColor: true } },
          skills: { select: { proficiency: true, skill: { select: { id: true, slug: true, name: true, category: true } } } },
          roles: { select: { role: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return records.map((r) => ({
    ...toProposalDto(r as any),
    opportunity: {
      id: r.opportunity.id,
      title: r.opportunity.title,
      status: r.opportunity.status,
      budgetType: r.opportunity.budgetType,
      minimumBudget: r.opportunity.minimumBudget?.toString() ?? null,
      maximumBudget: r.opportunity.maximumBudget?.toString() ?? null,
      currency: r.opportunity.currency,
      applicationDeadline: r.opportunity.applicationDeadline?.toISOString() ?? null,
    },
  }));
}
