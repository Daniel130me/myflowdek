/**
 * Project-related constants.
 *
 * Centralised so project logic never hard-codes limits or role names.
 */

/** Maximum project name length. */
export const PROJECT_NAME_MAX_LENGTH = 120;

/** Minimum project name length. */
export const PROJECT_NAME_MIN_LENGTH = 1;

/** Maximum project description length. */
export const PROJECT_DESCRIPTION_MAX_LENGTH = 2000;

/** Default color for a new project. */
export const DEFAULT_PROJECT_COLOR = '#FE8029';

/** Roles that can create projects within a workspace. */
export const PROJECT_CREATOR_WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;

/** Roles that can manage a project (update/archive/delete/members). */
export const PROJECT_MANAGER_ROLES = ['OWNER', 'ADMIN'] as const;

/** Roles a project member can be changed to (OWNER excluded — use transfer). */
export const VALID_PROJECT_MEMBER_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const;
