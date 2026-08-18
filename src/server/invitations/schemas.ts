import { z } from 'zod';
import { INVITATION_ROLES } from './constants';

/** Validation for creating an invitation. */
export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(INVITATION_ROLES).default('MEMBER'),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
