import { db } from '@/server/db/client';

/** Input shape for the onboarding payload (matches the client OnboardingData). */
export interface OnboardingInput {
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

/** Ensure slug uniqueness by appending a short suffix if needed.
 *  Single extra query only when a collision is detected. */
async function uniqueSlug(base: string, userId: string): Promise<string> {
  const candidate = `${base}-${userId.slice(-4)}`;
  const existing = await db.workspace.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });
  if (!existing) return candidate;
  // Extremely unlikely collision — append a timestamp fragment.
  return `${candidate}-${Date.now().toString(36).slice(-4)}`;
}

/**
 * Complete onboarding for a user in a single database transaction.
 *
 * Creates:
 *   1. A Workspace (tenant boundary)
 *   2. A WorkspaceMember row with OWNER role
 *   3. The first project (if a name was supplied), with a ProjectMember
 *      OWNER row
 *   4. Sets User.onboardedAt = now() so the session reflects completion
 *
 * All-or-nothing: if any step fails the transaction rolls back and the user
 * remains un-onboarded.
 *
 * Returns the created workspace and project (if any).
 */
export async function completeOnboarding(userId: string, input: OnboardingInput) {
  // Derive a workspace name from the project name or the user's email.
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  const workspaceName = input.projectName?.trim() || `${user.name ?? user.email}'s Workspace`;
  const baseSlug = slugify(workspaceName);
  const slug = await uniqueSlug(baseSlug, userId);

  return db.$transaction(async (tx) => {
    // 1. Create the workspace (tenant).
    const workspace = await tx.workspace.create({
      data: { name: workspaceName, slug },
    });

    // 2. Add the user as workspace OWNER.
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'OWNER',
      },
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
        data: {
          projectId: project.id,
          userId,
          role: 'OWNER',
          isFavorite: true,
        },
      });
    }

    // 4. Mark the user as onboarded (server-side source of truth).
    await tx.user.update({
      where: { id: userId },
      data: { onboardedAt: new Date() },
    });

    // TODO (future): persist invitations and preferences once those models
    // exist (see docs/BACKEND_DOMAIN_ROADMAP.md). For now the invitedMembers
    // and preferences fields are accepted but not yet stored.

    return { workspace, project };
  });
}

/** Type guard for parsing the onboarding request body. Throws on invalid shape. */
export function parseOnboardingInput(body: unknown): OnboardingInput {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid onboarding payload');
  }
  const b = body as Record<string, unknown>;
  return {
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
