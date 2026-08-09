import { db } from '@/server/db/client';

/**
 * Admin service — platform-level metrics for the internal Flowdeck admin
 * dashboard.
 *
 * All queries are aggregate counts (COUNT, SUM) — they don't load rows into
 * memory. Each function is a single round-trip to the DB.
 *
 * These are SUPER_ADMIN-only endpoints. The authorization check
 * (requireSuperAdmin) is done in the route, not here.
 */

/**
 * Get the platform overview: high-level counts for the admin dashboard.
 *
 * Runs multiple count queries in parallel for speed.
 */
export async function getOverview() {
  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    deletedUsers,
    onboardedUsers,
    verifiedUsers,
    totalWorkspaces,
    totalProjects,
    totalTasks,
    totalComments,
    totalFiles,
    storageUsed,
    failedLogins24h,
    newRegistrations7d,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: 'ACTIVE' } }),
    db.user.count({ where: { status: 'DISABLED' } }),
    db.user.count({ where: { status: 'DELETED' } }),
    db.user.count({ where: { onboardedAt: { not: null } } }),
    db.user.count({ where: { emailVerifiedAt: { not: null } } }),
    db.workspace.count(),
    db.project.count(),
    db.task.count(),
    db.comment.count(),
    db.file.count(),
    db.file.aggregate({ _sum: { size: true } }),
    db.auditLog.count({
      where: {
        action: 'login_failed',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    db.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      disabled: disabledUsers,
      deleted: deletedUsers,
      onboarded: onboardedUsers,
      verified: verifiedUsers,
      newRegistrations7d,
    },
    workspaces: totalWorkspaces,
    projects: totalProjects,
    tasks: totalTasks,
    comments: totalComments,
    files: totalFiles,
    storage: {
      bytesUsed: storageUsed._sum.size ?? 0,
      mbUsed: Math.round((storageUsed._sum.size ?? 0) / (1024 * 1024) * 100) / 100,
    },
    security: {
      failedLogins24h,
    },
  };
}

/**
 * List all users with their status, platform role, and key timestamps.
 * Ordered by creation date (newest first). Paginated.
 */
export async function listAllUsers(opts?: { limit?: number; offset?: number }) {
  const limit = Math.min(opts?.limit ?? 50, 100);
  const offset = opts?.offset ?? 0;

  return db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      avatarColor: true,
      jobTitle: true,
      status: true,
      platformRole: true,
      emailVerifiedAt: true,
      onboardedAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      _count: {
        select: {
          workspaces: true,
          ownedProjects: true,
          assignedTasks: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * List all workspaces with member counts and project counts.
 * Ordered by creation date (newest first). Paginated.
 */
export async function listAllWorkspaces(opts?: { limit?: number; offset?: number }) {
  const limit = Math.min(opts?.limit ?? 50, 100);
  const offset = opts?.offset ?? 0;

  return db.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          members: true,
          projects: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * List recent audit events (security log). Ordered by creation date
 * (newest first). Paginated.
 */
export async function listAuditEvents(opts?: { limit?: number; offset?: number; action?: string }) {
  const limit = Math.min(opts?.limit ?? 50, 100);
  const offset = opts?.offset ?? 0;

  return db.auditLog.findMany({
    where: opts?.action ? { action: opts.action } : undefined,
    select: {
      id: true,
      userId: true,
      action: true,
      ip: true,
      userAgent: true,
      meta: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * System health check — verifies the database connection and returns
 * uptime + migration status.
 */
export async function getSystemHealth() {
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    const migrationCount = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
    );

    return {
      status: 'healthy' as const,
      database: 'connected' as const,
      dbLatencyMs,
      migrations: (migrationCount as Array<{ count: number }>)[0]?.count ?? 0,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: 'degraded' as const,
      database: 'unavailable' as const,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
