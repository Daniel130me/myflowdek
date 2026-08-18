/**
 * Invitation-related constants.
 *
 * Centralised so the invitation logic never hard-codes TTLs or role names.
 */

/** How long an invitation stays valid before it expires (24 hours). */
export const INVITATION_TTL_HOURS = 24;

/** Roles that can issue workspace invitations. */
export const INVITATION_ISSUER_ROLES = ['OWNER', 'ADMIN'] as const;

/** Roles an invitation can offer to a new member. */
export const INVITATION_ROLES = ['ADMIN', 'MEMBER', 'GUEST'] as const;

/** Length of the generated invitation token (URL-safe hex). */
export const INVITATION_TOKEN_LENGTH = 48;
