import { z } from 'zod';

const currencyRegex = /^[A-Z]{3}$/;
const priceSchema = z
  .union([z.number().positive('Price must be greater than 0'), z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')])
  .transform((val) => Number(val));

export const milestoneInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, 'Milestone title is required').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  amount: priceSchema,
  dueDate: z.string().datetime().optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createEngagementSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  professionalProfileId: z.string().min(1, 'Professional profile ID is required'),
  opportunityId: z.string().optional().nullable(),
  proposalId: z.string().optional().nullable(),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  scopeDescription: z.string().trim().min(10, 'Scope description must be at least 10 characters').max(10000),
  agreedPrice: priceSchema,
  currency: z.string().regex(currencyRegex, 'Currency must be a 3-letter ISO code').default('USD'),
  startDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  milestones: z.array(milestoneInputSchema).optional(),
});

export const updateEngagementSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  scopeDescription: z.string().trim().min(10).max(10000).optional(),
  agreedPrice: priceSchema.optional(),
  currency: z.string().regex(currencyRegex).optional(),
  startDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  milestones: z.array(milestoneInputSchema).optional(),
});

export const sendEngagementOfferSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  scopeDescription: z.string().trim().min(10).max(10000).optional(),
  agreedPrice: priceSchema.optional(),
  currency: z.string().regex(currencyRegex).optional(),
  startDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  milestones: z.array(milestoneInputSchema).optional(),
});

export const submitMilestoneSchema = z.object({
  notes: z.string().trim().max(3000).optional().nullable(),
});

export const reviewMilestoneSchema = z.object({
  action: z.enum(['APPROVE', 'REQUEST_REVISION']),
  rejectionReason: z.string().trim().max(2000).optional().nullable(),
});

export const submitDeliverableSchema = z.object({
  milestoneId: z.string().optional().nullable(),
  title: z.string().trim().min(2, 'Title is required').max(200),
  description: z.string().trim().max(3000).optional().nullable(),
  fileUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  externalUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const cancelEngagementSchema = z.object({
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(2000),
});

export const disputeEngagementSchema = z.object({
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(2000),
});

export const listEngagementsQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'AWAITING_PROFESSIONAL_ACCEPTANCE', 'ACTIVE', 'WORK_SUBMITTED', 'COMPLETED', 'CANCELLED', 'DISPUTED'])
    .optional(),
  role: z.enum(['client', 'professional', 'all']).default('all'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;
export type CreateEngagementInput = z.infer<typeof createEngagementSchema>;
export type UpdateEngagementInput = z.infer<typeof updateEngagementSchema>;
export type SendEngagementOfferInput = z.infer<typeof sendEngagementOfferSchema>;
export type SubmitMilestoneInput = z.infer<typeof submitMilestoneSchema>;
export type ReviewMilestoneInput = z.infer<typeof reviewMilestoneSchema>;
export type SubmitDeliverableInput = z.infer<typeof submitDeliverableSchema>;
export type CancelEngagementInput = z.infer<typeof cancelEngagementSchema>;
export type DisputeEngagementInput = z.infer<typeof disputeEngagementSchema>;
export type ListEngagementsQuery = z.infer<typeof listEngagementsQuerySchema>;
