import { z } from 'zod';

export const submitReportSchema = z.object({
  targetType: z.enum(['PROFILE', 'OPPORTUNITY', 'PROPOSAL', 'ENGAGEMENT']),
  targetId: z.string().min(1),
  reason: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FRAUD_SUSPICION', 'OTHER']),
  details: z.string().trim().max(1000).optional(),
});

export const moderateProfileSchema = z.object({
  profileId: z.string().min(1),
  action: z.enum(['SUSPEND', 'REINSTATE']),
  reason: z.string().trim().min(5).max(500),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export type ModerateProfileInput = z.infer<typeof moderateProfileSchema>;
