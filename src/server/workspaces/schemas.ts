import { z } from 'zod';
import { WORKSPACE_NAME_MIN_LENGTH, WORKSPACE_NAME_MAX_LENGTH } from './constants';

/** Validation for creating a workspace. */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(WORKSPACE_NAME_MIN_LENGTH, 'Workspace name is required')
    .max(WORKSPACE_NAME_MAX_LENGTH, `Workspace name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters`),
});

/** Validation for updating a workspace (all fields optional). */
export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(WORKSPACE_NAME_MIN_LENGTH, 'Workspace name cannot be empty')
    .max(WORKSPACE_NAME_MAX_LENGTH, `Workspace name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters`)
    .optional(),
});

/** Validation for transferring workspace ownership. */
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().trim().min(1, 'newOwnerId is required'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
