import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireWorkspaceMember, authErrorResponse } from '@/server/auth/authorization';
import { db } from '@/server/db/client';

/**
 * GET /api/workspaces/:workspaceId/reports/portfolio
 *
 * Returns a portfolio summary: all projects in the workspace with task
 * counts, progress, member counts, and budget usage. Any workspace member
 * can view (but only sees projects they're a member of).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId } = await params;
    await requireWorkspaceMember(user.id, workspaceId);

    // Get projects the user is a member of, within this workspace.
    const projects = await db.project.findMany({
      where: {
        workspaceId,
        members: { some: { userId: user.id } },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
        startDate: true,
        endDate: true,
        _count: { select: { members: true, tasks: true } },
        tasks: {
          select: { status: true, progress: true },
        },
        budgets: {
          select: { totalBudget: true, spent: true, currency: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const portfolio = projects.map(p => {
      const totalTasks = p.tasks.length;
      const doneTasks = p.tasks.filter(t => t.status === 'done').length;
      const avgProgress = totalTasks ? Math.round(p.tasks.reduce((a, t) => a + t.progress, 0) / totalTasks) : 0;
      const totalBudget = p.budgets.reduce((a, b) => a + b.totalBudget, 0);
      const spent = p.budgets.reduce((a, b) => a + b.spent, 0);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        memberCount: p._count.members,
        taskCount: totalTasks,
        doneTasks,
        avgProgress,
        budget: { total: totalBudget, spent, currency: p.budgets[0]?.currency ?? 'USD' },
      };
    });

    return NextResponse.json({ portfolio });
  } catch (e) { return authErrorResponse(e); }
}
