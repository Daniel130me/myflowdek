import { db } from '@/server/db/client';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AuthError } from '@/server/auth/authorization';
import { sendInvitationEmail } from '@/server/email/service';
import { hashToken } from '@/server/invitations/service';

/** Input shape for the onboarding payload (matches the client OnboardingData). */
export interface OnboardingInput {
  name?: string;
  jobTitle?: string;
  avatarColor?: string;
  projectName?: string;
  projectColor?: string;
  projectDesc?: string;
  invitedMembers?: string[];
  preferences?: {
    defaultView?: string;
    enableNotifications?: boolean;
    theme?: 'light' | 'dark' | 'system';
  };
}

/** Invitation TTL in hours (same as the invitation system). */
const ONBOARDING_INVITATION_TTL_HOURS = 24;
const ONBOARDING_TRANSACTION_MAX_WAIT_MS = 10_000;
const ONBOARDING_TRANSACTION_TIMEOUT_MS = 20_000;

/**
 * Slugify a workspace name into a URL-safe slug.
 * "My Team Workspace" -> "my-team-workspace".
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'workspace';
}

/** Ensure slug uniqueness by appending a short suffix if needed. */
async function uniqueSlug(
  tx: Prisma.TransactionClient,
  base: string,
  userId: string,
): Promise<string> {
  const candidate = `${base}-${userId.slice(-4)}`;
  const existing = await tx.workspace.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });
  if (!existing) return candidate;
  return `${candidate}-${Date.now().toString(36).slice(-4)}`;
}

/** Generate a cryptographically random invitation token. */
function generateToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Complete onboarding for a user in a single database transaction.
 *
 * Creates:
 *   1. A Workspace (tenant boundary)
 *   2. A WorkspaceMember row with OWNER role
 *   3. The first project (if a name was supplied), with a ProjectMember OWNER row
 *   4. WorkspacePreference (defaultView, enableNotifications, theme)
 *   5. Invitation records for each invited member email
 *   6. Sets User.onboardedAt = now() (server-side source of truth)
 *
 * Idempotency: if the user is already onboarded (onboardedAt is set), the
 * transaction is rejected with a 409 error. This check happens INSIDE the
 * transaction to prevent race conditions.
 *
 * All-or-nothing: if any step fails the transaction rolls back.
 */
export async function completeOnboarding(userId: string, input: OnboardingInput) {
  const result = await db.$transaction(async (tx) => {
    // 0. Idempotency check — fetch the user INSIDE the transaction.
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, onboardedAt: true },
    });

    if (user.onboardedAt) {
      throw new AuthError('Already onboarded', 409);
    }

    // 1. Create the workspace (tenant).
    const workspaceName = input.projectName?.trim() || `${user.name ?? user.email}'s Workspace`;
    const baseSlug = slugify(workspaceName);
    const slug = await uniqueSlug(tx, baseSlug, userId);

    const workspace = await tx.workspace.create({
      data: { name: workspaceName, slug },
    });

    // 2. Add the user as workspace OWNER.
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId, role: 'OWNER' },
    });

    // 3. Create the first project if a name was supplied.
    let project: { id: string; name: string } | null = null;
    if (input.projectName?.trim()) {
      project = await tx.project.create({
        data: {
          name: input.projectName.trim(),
          description: input.projectDesc?.trim() || null,
          color: input.projectColor || '#FE8029',
          ownerId: userId,
          workspaceId: workspace.id,
        },
        select: { id: true, name: true },
      });

      await tx.projectMember.create({
        data: { projectId: project.id, userId, role: 'OWNER', isFavorite: true },
      });
    }

    // 4. Persist workspace preferences (do not silently discard user config).
    await tx.workspacePreference.create({
      data: {
        workspaceId: workspace.id,
        userId,
        defaultView: input.preferences?.defaultView ?? null,
        enableNotifications: input.preferences?.enableNotifications ?? true,
        theme: input.preferences?.theme ?? null,
      },
    });

    // 5. Create invitation records for invited members.
    const invitations: Array<{ email: string; rawToken: string; hashedToken: string }> = [];
    if (input.invitedMembers && input.invitedMembers.length > 0) {
      const expiresAt = new Date(Date.now() + ONBOARDING_INVITATION_TTL_HOURS * 60 * 60 * 1000);

      for (const email of input.invitedMembers) {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) continue;

        const rawToken = generateToken();
        const hashedToken = hashToken(rawToken);
        invitations.push({ email: cleanEmail, rawToken, hashedToken });
      }

      if (invitations.length > 0) {
        await tx.invitation.createMany({
          data: invitations.map(({ email, hashedToken }) => ({
            workspaceId: workspace.id,
            email,
            role: 'MEMBER',
            token: hashedToken,
            status: 'PENDING',
            invitedById: userId,
            expiresAt,
          })),
        });
      }
    }

    // 6. Persist profile fields & mark user as onboarded (server-side source of truth).
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        ...(input.jobTitle?.trim() ? { jobTitle: input.jobTitle.trim() } : {}),
        ...(input.avatarColor?.trim() ? { avatarColor: input.avatarColor.trim() } : {}),
        onboardedAt: new Date(),
      },
    });

    return { workspace, project, invitations };
  }, {
    maxWait: ONBOARDING_TRANSACTION_MAX_WAIT_MS,
    timeout: ONBOARDING_TRANSACTION_TIMEOUT_MS,
  });

  // Email is an external side effect and must never keep a database transaction
  // open. The invitation rows are committed before delivery is attempted.
  const { APP_BASE_URL } = await import('@/server/email/constants');
  for (const invitation of result.invitations) {
    sendInvitationEmail(
      invitation.email,
      invitation.rawToken,
      result.workspace.name,
      APP_BASE_URL,
    ).catch((error) => {
      console.error('[onboarding] invitation email failed for', invitation.email, error);
    });
  }

  return { workspace: result.workspace, project: result.project };
}

/** Type guard for parsing the onboarding request body. Throws on invalid shape. */
export function parseOnboardingInput(body: unknown): OnboardingInput {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid onboarding payload');
  }
  const b = body as Record<string, unknown>;
  return {
    name: typeof b.name === 'string' ? b.name : undefined,
    jobTitle: typeof b.jobTitle === 'string' ? b.jobTitle : undefined,
    avatarColor: typeof b.avatarColor === 'string' ? b.avatarColor : undefined,
    projectName: typeof b.projectName === 'string' ? b.projectName : undefined,
    projectColor: typeof b.projectColor === 'string' ? b.projectColor : undefined,
    projectDesc: typeof b.projectDesc === 'string' ? b.projectDesc : undefined,
    invitedMembers: Array.isArray(b.invitedMembers)
      ? b.invitedMembers.filter((m): m is string => typeof m === 'string')
      : undefined,
    preferences:
      typeof b.preferences === 'object' && b.preferences !== null
        ? (b.preferences as OnboardingInput['preferences'])
        : undefined,
  };
}
