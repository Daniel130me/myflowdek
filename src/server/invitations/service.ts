import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AuthError } from '@/server/auth/authorization';
import { audit } from '@/server/audit/log';
import { INVITATION_TTL_HOURS, INVITATION_TOKEN_LENGTH } from './constants';
import type { CreateInvitationInput } from './schemas';

/**
 * Invitation service — all invitation business logic lives here.
 *
 * Token-based: each invitation gets a cryptographically random token that the
 * recipient follows to accept or decline. Tokens expire after
 * INVITATION_TTL_HOURS. Accepting creates a WorkspaceMember row in a
 * transaction with the invitation status update.
 */

/** Fields returned by invitation queries — never exposes the token on list. */
const invitationSelect = {
  id: true,
  workspaceId: true,
  email: true,
  role: true,
  status: true,
  invitedById: true,
  expiresAt: true,
  acceptedAt: true,
  declinedAt: true,
  createdAt: true,
  workspace: { select: { id: true, name: true, slug: true } },
} as const;

/** Generate a URL-safe cryptographically random token. */
function generateToken(): string {
  // randomBytes(n) yields 2n hex chars; we want INVITATION_TOKEN_LENGTH chars.
  const bytes = Math.ceil(INVITATION_TOKEN_LENGTH / 2);
  return randomBytes(bytes).toString('hex').slice(0, INVITATION_TOKEN_LENGTH);
}

/** Compute the expiry timestamp (now + TTL). */
function expiryDate(): Date {
  return new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
}

/** Has an invitation expired (past its expiresAt)? */
function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

/**
 * Create a new pending invitation.
 *
 * Guards:
 *   - Cannot invite an email that is already a member of the workspace.
 *   - Cannot create a duplicate PENDING invitation for the same email+workspace
 *     (revoke the old one first, or resend).
 */
export async function createInvitation(
  workspaceId: string,
  invitedById: string,
  input: CreateInvitationInput,
) {
  // Check if the email is already a member.
  const existingMember = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { email: input.email },
    },
    select: { userId: true },
  });
  if (existingMember) {
    throw new AuthError('This user is already a member of the workspace', 409);
  }

  // Check for an existing PENDING invitation to the same email.
  const existingPending = await db.invitation.findFirst({
    where: { workspaceId, email: input.email, status: 'PENDING' },
    select: { id: true },
  });
  if (existingPending) {
    throw new AuthError(
      'A pending invitation already exists for this email. Revoke it first or wait for it to expire.',
      409,
    );
  }

  const token = generateToken();
  const invitation = await db.invitation.create({
    data: {
      workspaceId,
      email: input.email,
      role: input.role,
      token,
      status: 'PENDING',
      invitedById,
      expiresAt: expiryDate(),
    },
    select: { ...invitationSelect, token: true },
  });

  await audit({
    userId: invitedById,
    action: 'invitation_created',
    meta: { invitationId: invitation.id, workspaceId, email: input.email, role: input.role },
  });

  // TODO (future): send the invitation email containing the token URL.
  // For now the token is returned in the response so the caller can display
  // or share it. In production, strip the token from the response and only
  // send it via email.

  return invitation;
}

/**
 * List all invitations for a workspace (any status). Single query with the
 * workspace name joined — no N+1.
 */
export async function listInvitations(workspaceId: string) {
  return db.invitation.findMany({
    where: { workspaceId },
    select: invitationSelect,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke (delete) an invitation. Only PENDING invitations can be revoked.
 * The caller must be a workspace manager (OWNER/ADMIN) — verified in the route.
 */
export async function revokeInvitation(workspaceId: string, invitationId: string) {
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    select: { status: true, workspaceId: true },
  });
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new AuthError('Invitation not found', 404);
  }
  if (invitation.status !== 'PENDING') {
    throw new AuthError('Only pending invitations can be revoked', 409);
  }

  // Mark as REVOKED (keep the row for audit) rather than hard-deleting.
  await db.invitation.update({
    where: { id: invitationId },
    data: { status: 'REVOKED' },
  });
}

/**
 * Get an invitation by its token (public endpoint — no auth required, since
 * the recipient may not be logged in yet). Returns the workspace name + role
 * so the recipient can decide whether to accept.
 *
 * Marks expired invitations as EXPIRED (lazy expiry).
 */
export async function getInvitationByToken(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { token },
    select: { ...invitationSelect, token: true, expiresAt: true },
  });
  if (!invitation) {
    throw new AuthError('Invitation not found', 404);
  }

  // Lazy expiry: mark as EXPIRED if past the TTL and still PENDING.
  if (invitation.status === 'PENDING' && isExpired(invitation.expiresAt)) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    return { ...invitation, status: 'EXPIRED' as const };
  }

  return invitation;
}

/**
 * Accept an invitation. The authenticated user's email must match the
 * invitation email (prevents token sharing across accounts).
 *
 * Transaction:
 *   1. Verify the invitation is still PENDING + not expired.
 *   2. Create the WorkspaceMember row.
 *   3. Mark the invitation ACCEPTED.
 *
 * If the user is already a member (e.g. accepted via another path), the
 * invitation is still marked ACCEPTED but no duplicate membership is created.
 */
export async function acceptInvitation(token: string, userId: string, userEmail: string) {
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new AuthError('Invitation not found', 404);
    }

    if (invitation.email !== userEmail) {
      throw new AuthError(
        'This invitation was sent to a different email address. Sign in with the invited email.',
        403,
      );
    }

    if (invitation.status !== 'PENDING') {
      throw new AuthError(`This invitation has already been ${invitation.status.toLowerCase()}`, 409);
    }

    if (isExpired(invitation.expiresAt)) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new AuthError('This invitation has expired', 410);
    }

    // Create the membership if it doesn't already exist (idempotent).
    const existingMembership = await tx.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId },
      },
    });
    if (!existingMembership) {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      });
    }

    // Mark accepted.
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    await audit({
      userId,
      action: 'invitation_accepted',
      meta: { invitationId: invitation.id, workspaceId: invitation.workspaceId },
    });

    return {
      workspaceId: invitation.workspaceId,
      role: invitation.role,
    };
  });
}

/**
 * Decline an invitation. The authenticated user's email must match.
 * Transaction: verify + mark DECLINED.
 */
export async function declineInvitation(token: string, userEmail: string) {
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new AuthError('Invitation not found', 404);
    }

    if (invitation.email !== userEmail) {
      throw new AuthError('This invitation was sent to a different email address', 403);
    }

    if (invitation.status !== 'PENDING') {
      throw new AuthError(`This invitation has already been ${invitation.status.toLowerCase()}`, 409);
    }

    if (isExpired(invitation.expiresAt)) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new AuthError('This invitation has expired', 410);
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED', declinedAt: new Date() },
    });

    await audit({
      action: 'invitation_declined',
      meta: { invitationId: invitation.id, workspaceId: invitation.workspaceId },
    });

    return { ok: true };
  });
}
