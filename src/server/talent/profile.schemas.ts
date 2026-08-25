import { z } from 'zod';

export const REMOTE_PREFERENCES = ['REMOTE_ONLY', 'HYBRID', 'ONSITE', 'FLEXIBLE'] as const;
export const RATE_TYPES = ['HOURLY', 'FIXED', 'NEGOTIABLE'] as const;
export const AVAILABILITY_STATUSES = ['AVAILABLE_NOW', 'AVAILABLE_SOON', 'LIMITED', 'UNAVAILABLE'] as const;
export const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

const nullableText = (maximum: number) =>
  z.union([z.string().trim().max(maximum), z.null()]);

const nullableCurrency = z.union([
  z.string().trim().length(3).regex(/^[A-Za-z]{3}$/, 'Use a three-letter currency code.').transform((value) => value.toUpperCase()),
  z.null(),
]);

const selectedSkillSchema = z.object({
  skillId: z.string().min(1),
  proficiency: z.enum(PROFICIENCY_LEVELS),
}).strict();

const availabilitySchema = z.object({
  status: z.enum(AVAILABILITY_STATUSES),
  weeklyAvailableHours: z.number().int().min(0).max(168).nullable(),
  availableFrom: z.union([
    z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), 'Use a valid availability date.'),
    z.null(),
  ]),
}).strict();

export const updateProfessionalProfileSchema = z.object({
  professionalTitle: nullableText(120).optional(),
  bio: nullableText(4000).optional(),
  yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
  location: nullableText(120).optional(),
  timezone: nullableText(100).optional(),
  remotePreference: z.union([z.enum(REMOTE_PREFERENCES), z.null()]).optional(),
  rateType: z.union([z.enum(RATE_TYPES), z.null()]).optional(),
  minimumRate: z.number().min(0).max(9999999999.99).nullable().optional(),
  maximumRate: z.number().min(0).max(9999999999.99).nullable().optional(),
  currency: nullableCurrency.optional(),
  roleIds: z.array(z.string().min(1)).max(5).optional(),
  skills: z.array(selectedSkillSchema).max(30).optional(),
  availability: availabilitySchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.minimumRate != null && value.maximumRate != null && value.minimumRate > value.maximumRate) {
    context.addIssue({
      code: 'custom',
      path: ['maximumRate'],
      message: 'Maximum rate must be greater than or equal to minimum rate.',
    });
  }

  if (value.roleIds && new Set(value.roleIds).size !== value.roleIds.length) {
    context.addIssue({ code: 'custom', path: ['roleIds'], message: 'Roles must be unique.' });
  }

  if (value.skills && new Set(value.skills.map(({ skillId }) => skillId)).size !== value.skills.length) {
    context.addIssue({ code: 'custom', path: ['skills'], message: 'Skills must be unique.' });
  }
});

const httpUrl = z.string().trim().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Portfolio links must use http or https.');

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: nullableText(1000).optional(),
  url: httpUrl,
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).strict();

export const updatePortfolioItemSchema = portfolioItemSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Provide at least one field to update.',
);

export type UpdateProfessionalProfileInput = z.infer<typeof updateProfessionalProfileSchema>;
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
