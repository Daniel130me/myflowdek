import { z } from 'zod';

export const opportunityBudgetTypeSchema = z.enum(['HOURLY', 'FIXED', 'NEGOTIABLE']);
export const opportunityProficiencyLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
export const opportunityStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED']);
export const proposalStatusSchema = z.enum(['SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']);

export const opportunitySkillRequirementInputSchema = z.object({
  skillId: z.string().min(1, 'Skill ID is required.'),
  minimumProficiency: opportunityProficiencyLevelSchema,
  isRequired: z.boolean().default(true),
  notes: z.string().trim().max(500).nullish(),
});

export const upsertTalentOpportunitySchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(160, 'Title cannot exceed 160 characters.'),
    description: z.string().trim().min(20, 'Description must be at least 20 characters.').max(10000, 'Description cannot exceed 10000 characters.'),
    deliverablesSummary: z.string().trim().max(4000).nullish(),
    budgetType: opportunityBudgetTypeSchema.nullish(),
    minimumBudget: z
      .union([z.number(), z.string()])
      .nullish()
      .transform((val) => (val === '' || val == null ? null : String(val))),
    maximumBudget: z
      .union([z.number(), z.string()])
      .nullish()
      .transform((val) => (val === '' || val == null ? null : String(val))),
    currency: z.string().trim().length(3, 'Currency must be a 3-letter ISO code.').toUpperCase().default('USD').nullish(),
    expectedDuration: z.string().trim().max(100).nullish(),
    applicationDeadline: z.string().datetime().nullish(),
    requiredSkills: z.array(opportunitySkillRequirementInputSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.minimumBudget != null && data.maximumBudget != null) {
        return Number(data.maximumBudget) >= Number(data.minimumBudget);
      }
      return true;
    },
    {
      message: 'Maximum budget must be greater than or equal to minimum budget.',
      path: ['maximumBudget'],
    },
  );

export type UpsertTalentOpportunityInput = z.input<typeof upsertTalentOpportunitySchema>;

export const createTalentProposalSchema = z.object({
  proposedPrice: z
    .union([z.number().positive('Price must be greater than 0.'), z.string().min(1, 'Price is required.')])
    .transform((val) => String(val)),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code.').toUpperCase().default('USD'),
  estimatedDuration: z.string().trim().min(1, 'Estimated duration is required.').max(100),
  coverMessage: z.string().trim().min(20, 'Cover message must be at least 20 characters.').max(4000),
  proposedApproach: z.string().trim().max(4000).nullish(),
  milestoneSuggestions: z.any().nullish(),
});

export type CreateTalentProposalInput = z.input<typeof createTalentProposalSchema>;

export const updateTalentProposalSchema = z.object({
  proposedPrice: z
    .union([z.number().positive(), z.string().min(1)])
    .transform((val) => String(val))
    .optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  estimatedDuration: z.string().trim().min(1).max(100).optional(),
  coverMessage: z.string().trim().min(20).max(4000).optional(),
  proposedApproach: z.string().trim().max(4000).nullish(),
  milestoneSuggestions: z.any().nullish(),
});

export type UpdateTalentProposalInput = z.input<typeof updateTalentProposalSchema>;

export const opportunityDirectorySortSchema = z.enum([
  'NEWEST',
  'BUDGET_HIGH_TO_LOW',
  'BUDGET_LOW_TO_HIGH',
  'DEADLINE_SOONEST',
]);

export type OpportunityDirectorySort = z.infer<typeof opportunityDirectorySortSchema>;
