import { z } from 'zod';

import { PROFICIENCY_LEVELS } from './profile.schemas';

const competencyRequirementSchema = z.object({
  skillId: z.string().trim().min(1).max(80),
  minimumProficiency: z.enum(PROFICIENCY_LEVELS),
  isRequired: z.boolean().default(true),
  notes: z.string().trim().max(500).nullable().optional(),
}).strict();

export const replaceTaskCompetenciesSchema = z.object({
  requirements: z.array(competencyRequirementSchema).max(20),
}).strict().superRefine((value, context) => {
  const seen = new Set<string>();
  value.requirements.forEach((requirement, index) => {
    if (seen.has(requirement.skillId)) {
      context.addIssue({ code: 'custom', path: ['requirements', index, 'skillId'], message: 'Each skill can appear only once.' });
    }
    seen.add(requirement.skillId);
  });
});

const optionalMoney = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.coerce.number().positive().max(9999999999.99).optional(),
);

const optionalDate = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
);

export const createTalentInvitationSchema = z.object({
  professionalProfileId: z.string().trim().min(1).max(80),
  message: z.string().trim().max(2000).optional(),
  proposedBudget: optionalMoney,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  proposedDeadline: optionalDate,
}).strict().superRefine((value, context) => {
  if (value.proposedBudget != null && !value.currency) {
    context.addIssue({ code: 'custom', path: ['currency'], message: 'Currency is required when a budget is supplied.' });
  }
  if (value.currency && value.proposedBudget == null) {
    context.addIssue({ code: 'custom', path: ['proposedBudget'], message: 'A budget is required when currency is supplied.' });
  }
  if (value.proposedDeadline && value.proposedDeadline <= new Date()) {
    context.addIssue({ code: 'custom', path: ['proposedDeadline'], message: 'The proposed deadline must be in the future.' });
  }
});

export type ReplaceTaskCompetenciesInput = z.infer<typeof replaceTaskCompetenciesSchema>;
export type CreateTalentInvitationInput = z.infer<typeof createTalentInvitationSchema>;
