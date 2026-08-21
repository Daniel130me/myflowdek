import { z } from 'zod';

export const createProfessionalReviewSchema = z.object({
  qualityRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  competenceRating: z.number().int().min(1).max(5),
  timelinessRating: z.number().int().min(1).max(5),
  wouldHireAgain: z.boolean(),
  writtenFeedback: z.string().trim().max(2000).optional().nullable(),
});

export const createClientReviewSchema = z.object({
  clarityRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  professionalismRating: z.number().int().min(1).max(5),
  paymentRating: z.number().int().min(1).max(5),
  wouldWorkAgain: z.boolean(),
  writtenFeedback: z.string().trim().max(2000).optional().nullable(),
});

export type CreateProfessionalReviewInput = z.infer<typeof createProfessionalReviewSchema>;
export type CreateClientReviewInput = z.infer<typeof createClientReviewSchema>;
