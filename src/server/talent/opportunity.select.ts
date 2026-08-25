import type { Prisma } from '@prisma/client';

export const publicOpportunitySkillSelect = {
  id: true,
  minimumProficiency: true,
  isRequired: true,
  notes: true,
  skill: {
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
    },
  },
} satisfies Prisma.OpportunitySkillRequirementSelect;

export const publicOpportunitySelect = {
  id: true,
  taskId: true,
  status: true,
  title: true,
  description: true,
  deliverablesSummary: true,
  budgetType: true,
  minimumBudget: true,
  maximumBudget: true,
  currency: true,
  expectedDuration: true,
  applicationDeadline: true,
  publishedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  requiredSkills: {
    select: publicOpportunitySkillSelect,
    orderBy: [{ isRequired: 'desc' }, { skill: { sortOrder: 'asc' } }],
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      avatarColor: true,
    },
  },
  _count: {
    select: {
      proposals: true,
    },
  },
} satisfies Prisma.TalentOpportunitySelect;

export type PublicOpportunityRecord = Prisma.TalentOpportunityGetPayload<{
  select: typeof publicOpportunitySelect;
}>;

export function toPublicOpportunityDto(record: PublicOpportunityRecord) {
  return {
    id: record.id,
    taskId: record.taskId,
    status: record.status,
    title: record.title,
    description: record.description,
    deliverablesSummary: record.deliverablesSummary,
    budgetType: record.budgetType,
    minimumBudget: record.minimumBudget?.toString() ?? null,
    maximumBudget: record.maximumBudget?.toString() ?? null,
    currency: record.currency,
    expectedDuration: record.expectedDuration,
    applicationDeadline: record.applicationDeadline?.toISOString() ?? null,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    closedAt: record.closedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    proposalsCount: record._count.proposals,
    requiredSkills: record.requiredSkills.map((req) => ({
      id: req.id,
      minimumProficiency: req.minimumProficiency,
      isRequired: req.isRequired,
      notes: req.notes,
      skill: {
        id: req.skill.id,
        slug: req.skill.slug,
        name: req.skill.name,
        category: req.skill.category,
      },
    })),
    createdBy: {
      id: record.createdBy.id,
      displayName: record.createdBy.name ?? 'Project Manager',
      avatarColor: record.createdBy.avatarColor,
    },
  };
}

export type PublicOpportunityDto = ReturnType<typeof toPublicOpportunityDto>;

export const proposalDetailSelect = {
  id: true,
  opportunityId: true,
  proposedPrice: true,
  currency: true,
  estimatedDuration: true,
  coverMessage: true,
  proposedApproach: true,
  milestoneSuggestions: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  professionalProfile: {
    select: {
      id: true,
      slug: true,
      professionalTitle: true,
      location: true,
      timezone: true,
      remotePreference: true,
      user: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
        },
      },
      skills: {
        select: {
          proficiency: true,
          skill: {
            select: {
              id: true,
              slug: true,
              name: true,
              category: true,
            },
          },
        },
      },
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TalentProposalSelect;

export type ProposalDetailRecord = Prisma.TalentProposalGetPayload<{
  select: typeof proposalDetailSelect;
}>;

export function toProposalDto(record: ProposalDetailRecord) {
  return {
    id: record.id,
    opportunityId: record.opportunityId,
    proposedPrice: record.proposedPrice.toString(),
    currency: record.currency,
    estimatedDuration: record.estimatedDuration,
    coverMessage: record.coverMessage,
    proposedApproach: record.proposedApproach,
    milestoneSuggestions: record.milestoneSuggestions,
    status: record.status,
    submittedAt: record.submittedAt.toISOString(),
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    respondedAt: record.respondedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    professional: {
      id: record.professionalProfile.id,
      slug: record.professionalProfile.slug,
      displayName: record.professionalProfile.user.name ?? 'Flowdek Professional',
      avatarColor: record.professionalProfile.user.avatarColor,
      professionalTitle: record.professionalProfile.professionalTitle,
      location: record.professionalProfile.location,
      timezone: record.professionalProfile.timezone,
      remotePreference: record.professionalProfile.remotePreference,
      roles: record.professionalProfile.roles.map((r) => r.role.name),
      skills: record.professionalProfile.skills.map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        slug: s.skill.slug,
        category: s.skill.category,
        proficiency: s.proficiency,
      })),
    },
  };
}

export type ProposalDto = ReturnType<typeof toProposalDto>;
