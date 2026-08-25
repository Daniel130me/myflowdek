/**
 * Workspace-related constants.
 *
 * Centralised so workspace logic never hard-codes limits or role names.
 */

/** Maximum workspace name length (enforced by Zod). */
export const WORKSPACE_NAME_MAX_LENGTH = 100;

/** Minimum workspace name length. */
export const WORKSPACE_NAME_MIN_LENGTH = 1;

/** Maximum slug length (derived from the name). */
export const WORKSPACE_SLUG_MAX_LENGTH = 50;

/** Roles that can manage workspace settings and members. */
export const WORKSPACE_MANAGER_ROLES = ['OWNER', 'ADMIN'] as const;

/** Role that can delete or transfer a workspace. */
export const WORKSPACE_OWNER_ROLE = 'OWNER' as const;

/**
 * A workspace cannot be deleted while it has more than this many members.
 * The owner must remove other members (or transfer ownership) first, to
 * prevent accidental destruction of a shared team's data.
 */
export const WORKSPACE_DELETE_MAX_MEMBERS = 1;
