import { db } from '@/server/db/client';

/**
 * Search service — PostgreSQL search across multiple models.
 *
 * Uses ILIKE for case-insensitive substring matching. This works on all
 * PostgreSQL versions without requiring extensions. A future enhancement
 * can add GIN trigram indexes (pg_trgm) for performance on large datasets.
 *
 * All searches are scoped to the workspaces the caller is a member of — a
 * user never sees results from workspaces they don't belong to.
 */

/** Minimum query length to avoid empty/wildcard matches. */
const MIN_QUERY_LENGTH = 2;

/** Maximum results per category. */
const MAX_RESULTS_PER_CATEGORY = 10;

export interface SearchResult {
  projects: Array<{ id: string; name: string; description: string | null; color: string }>;
  tasks: Array<{ id: string; name: string; status: string; projectId: string; projectName: string }>;
  comments: Array<{ id: string; text: string; taskId: string; taskName: string }>;
  people: Array<{ id: string; name: string | null; email: string; avatarColor: string | null }>;
  files: Array<{ id: string; name: string; size: number; projectId: string }>;
}

/**
 * Search across all models for a user. The `userId` is used to scope results
 * to workspaces the user belongs to.
 *
 * Returns categorized results (projects, tasks, comments, people, files).
 * Each category is capped at MAX_RESULTS_PER_CATEGORY.
 *
 * All five queries run in parallel (Promise.all) for speed.
 */
export async function search(
  userId: string,
  query: string,
): Promise<SearchResult> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return { projects: [], tasks: [], comments: [], people: [], files: [] };
  }

  // Run all searches in parallel for speed.
  const [projects, tasks, comments, people, files] = await Promise.all([
    // Projects the user is a member of.
    db.project.findMany({
      where: {
        members: { some: { userId } },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, description: true, color: true },
      take: MAX_RESULTS_PER_CATEGORY,
      orderBy: { updatedAt: 'desc' },
    }),

    // Tasks in projects the user is a member of.
    db.task.findMany({
      where: {
        project: { members: { some: { userId } } },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        projectId: true,
        project: { select: { name: true } },
      },
      take: MAX_RESULTS_PER_CATEGORY,
      orderBy: { updatedAt: 'desc' },
    }),

    // Comments in projects the user is a member of.
    db.comment.findMany({
      where: {
        project: { members: { some: { userId } } },
        text: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        text: true,
        taskId: true,
        task: { select: { name: true } },
      },
      take: MAX_RESULTS_PER_CATEGORY,
      orderBy: { createdAt: 'desc' },
    }),

    // People in the user's workspaces.
    db.user.findMany({
      where: {
        workspaces: {
          some: {
            workspace: {
              members: { some: { userId } },
            },
          },
        },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, avatarColor: true },
      take: MAX_RESULTS_PER_CATEGORY,
    }),

    // Files in projects the user is a member of.
    db.file.findMany({
      where: {
        project: { members: { some: { userId } } },
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, name: true, size: true, projectId: true },
      take: MAX_RESULTS_PER_CATEGORY,
      orderBy: { uploadedAt: 'desc' },
    }),
  ]);

  // Transform tasks to include projectName flat.
  const tasksFormatted = tasks.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    projectId: t.projectId,
    projectName: t.project.name,
  }));

  // Transform comments to include taskName flat.
  const commentsFormatted = comments.map(c => ({
    id: c.id,
    text: c.text,
    taskId: c.taskId,
    taskName: c.task?.name ?? '',
  }));

  return {
    projects,
    tasks: tasksFormatted,
    comments: commentsFormatted,
    people,
    files,
  };
}
