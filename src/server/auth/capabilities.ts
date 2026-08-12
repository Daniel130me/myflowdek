/**
 * Centralized capability matrix for FlowDeck.
 *
 * Defines which roles can perform which actions. This is the single source
 * of truth for authorization — routes import these constants instead of
 * hard-coding role arrays.
 *
 * Completely distinct from:
 *   - User.platformRole (SUPER_ADMIN vs USER — internal team access)
 *   - User.jobTitle (display only, no authorization meaning)
 */

import type { ProjectRole, WorkspaceRole } from '@prisma/client';

/* --------------------------- Project capabilities --------------------------- */

export const PROJECT_PERMISSIONS = {
  /** View project details, tasks, members. */
  VIEW_PROJECT: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as ProjectRole[],
  /** Create new tasks. */
  CREATE_TASK: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Edit existing tasks (name, description, status, priority, dates). */
  EDIT_TASK: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Delete tasks. */
  DELETE_TASK: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Manage project settings (name, description, color, archive/restore). */
  MANAGE_PROJECT: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Add/remove/update project members and their roles. */
  MANAGE_MEMBERS: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Manage sections. */
  MANAGE_SECTIONS: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Manage tags. */
  MANAGE_TAGS: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Manage automations. */
  MANAGE_AUTOMATIONS: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Manage budgets and expenses. */
  MANAGE_BUDGETS: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Manage forms. */
  MANAGE_FORMS: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Manage approvals (create/resolve). */
  MANAGE_APPROVALS: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Manage comments (any member can comment; deletion follows own-content rule). */
  CREATE_COMMENT: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Upload files. */
  UPLOAD_FILES: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Delete files (managers can delete any; members only their own). */
  DELETE_FILES: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Bulk operations on tasks. */
  BULK_OPERATIONS: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Manage custom fields on a project (create/update/delete field definitions). */
  MANAGE_CUSTOM_FIELDS: ['OWNER', 'ADMIN'] as ProjectRole[],
  /** Post/delete project status updates (standup-style posts). */
  MANAGE_STATUS_UPDATES: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Add/remove task dependencies (blocking relationships). */
  MANAGE_DEPENDENCIES: ['OWNER', 'ADMIN', 'MEMBER'] as ProjectRole[],
  /** Approve submitted timesheet entries. */
  APPROVE_TIMESHEETS: ['OWNER', 'ADMIN'] as ProjectRole[],
} as const;

export type ProjectCapability = keyof typeof PROJECT_PERMISSIONS;

/* -------------------------- Workspace capabilities ------------------------- */

export const WORKSPACE_PERMISSIONS = {
  /** View workspace details and projects. */
  VIEW_WORKSPACE: ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] as WorkspaceRole[],
  /** Create projects within the workspace. */
  CREATE_PROJECT: ['OWNER', 'ADMIN', 'MEMBER'] as WorkspaceRole[],
  /** Manage workspace settings (rename, delete). */
  MANAGE_WORKSPACE: ['OWNER', 'ADMIN'] as WorkspaceRole[],
  /** Manage workspace members and roles. */
  MANAGE_MEMBERS: ['OWNER', 'ADMIN'] as WorkspaceRole[],
  /** Invite new members. */
  INVITE_MEMBERS: ['OWNER', 'ADMIN'] as WorkspaceRole[],
  /** Manage goals/OKRs. */
  MANAGE_GOALS: ['OWNER', 'ADMIN'] as WorkspaceRole[],
  /** Delete the workspace (owner only). */
  DELETE_WORKSPACE: ['OWNER'] as WorkspaceRole[],
  /** Transfer ownership. */
  TRANSFER_OWNERSHIP: ['OWNER'] as WorkspaceRole[],
} as const;

export type WorkspaceCapability = keyof typeof WORKSPACE_PERMISSIONS;
