import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { randomBytes, createHash } from 'node:crypto';
import { AuthError } from '@/server/auth/authorization';
import { audit } from '@/server/audit/log';
import { INVITATION_TTL_HOURS, INVITATION_TOKEN_LENGTH } from './constants';
import type { CreateInvitationInput } from './schemas';
import { sendInvitationEmail } from '@/server/email/service';
import { APP_BASE_URL } from '@/server/email/constants';

type InvitationEmailSender = typeof sendInvitationEmail;

/** Hash a token using SHA-256 for secure storage.
 *  The raw token is emailed to the user; only the hash is stored in the DB. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
  emailSender: InvitationEmailSender = sendInvitationEmail,
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

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const invitation = await db.invitation.create({
    data: {
      workspaceId,
      email: input.email,
      role: input.role,
      token: tokenHash,
      status: 'PENDING',
      invitedById,
      expiresAt: expiryDate(),
    },
    select: { ...invitationSelect, token: false },
  });

  await audit({
    userId: invitedById,
    action: 'invitation_created',
    meta: { invitationId: invitation.id, workspaceId, email: input.email, role: input.role },
  });

  // Send the invitation email with the raw token (the hash is stored in DB,
  // the raw token is only in the email — never in the API response).
  let emailSent = false;
  try {
    emailSent = await emailSender(
      input.email,
      rawToken,
      invitation.workspace.name,
      APP_BASE_URL,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    console.error('[invitations] email delivery failed:', message);
  }

  if (!emailSent) {
    // The raw token is intentionally not persisted. Revoke the unusable row so
    // the workspace owner can retry immediately after correcting email setup.
    await db.invitation.updateMany({
      where: { id: invitation.id, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    throw new AuthError(
      'Invitation email could not be sent. Check the email configuration and try again.',
      502,
    );
  }

  // Return the invitation WITHOUT the raw token — the caller never sees it.
  return invitation;
}

/**
 * List pending invitations for workspace management. Historical statuses stay
 * in PostgreSQL for audit but are not sent to the settings page.
 */
export async function listInvitations(workspaceId: string) {
  return db.invitation.findMany({
    where: { workspaceId, status: 'PENDING' },
    select: invitationSelect,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke (delete) an invitation. Only PENDING invitations can be revoked.
 * The caller must be a workspace manager (OWNER/ADMIN) — verified in the route.
 */
export async function revokeInvitation(workspaceId: string, invitationId: string) {
  // The common success path is one atomic query, which also prevents two
  // concurrent revoke requests from both reporting success.
  const revoked = await db.invitation.updateMany({
    where: { id: invitationId, workspaceId, status: 'PENDING' },
    data: { status: 'REVOKED' },
  });
  if (revoked.count === 1) return;

  // Only query again on failure so callers still receive a useful 404 or 409.
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    select: { status: true, workspaceId: true },
  });
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new AuthError('Invitation not found', 404);
  }
  throw new AuthError('Only pending invitations can be revoked', 409);
}

/**
 * Get an invitation by its token (public endpoint — no auth required, since
 * the recipient may not be logged in yet). Returns the workspace name + role
 * so the recipient can decide whether to accept.
 *
 * Marks expired invitations as EXPIRED (lazy expiry).
 */
export async function getInvitationByToken(token: string) {
  const tokenHash = hashToken(token);
  const invitation = await db.invitation.findUnique({
    where: { token: tokenHash },
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
  const tokenHash = hashToken(token);
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { token: tokenHash },
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
  const tokenHash = hashToken(token);
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { token: tokenHash },
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
