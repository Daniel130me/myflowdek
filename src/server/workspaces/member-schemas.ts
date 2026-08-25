import { z } from 'zod';
import { WORKSPACE_NAME_MAX_LENGTH } from '../workspaces/constants';

/** Roles a member can be changed to (OWNER is excluded — use transfer endpoint). */
export const VALID_MEMBER_ROLES = ['ADMIN', 'MEMBER', 'GUEST'] as const;

/** Validation for updating a member's role. */
export const updateMemberRoleSchema = z.object({
  role: z.enum(VALID_MEMBER_ROLES),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/** Suppress unused-import warning for the re-exported constant. */
export const _WORKSPACE_NAME_MAX_LENGTH = WORKSPACE_NAME_MAX_LENGTH;
