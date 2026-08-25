import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { db } from '@/server/db/client';

/**
 * GET /api/projects/:projectId/reports/workload
 *
 * Returns per-member workload: assigned tasks (by status), total estimated
 * duration, and capacity utilization. Any project member can view.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');

    // Group tasks by assignee with counts + total duration.
    const tasks = await db.task.findMany({
      where: { projectId, assigneeId: { not: null } },
      select: { assigneeId: true, status: true, duration: true },
    });

    const workload: Record<string, { assigned: number; done: number; inProgress: number; backlog: number; totalDays: number }> = {};

    for (const t of tasks) {
      const id = t.assigneeId!;
      if (!workload[id]) workload[id] = { assigned: 0, done: 0, inProgress: 0, backlog: 0, totalDays: 0 };
      workload[id].assigned++;
      workload[id].totalDays += t.duration;
      if (t.status === 'done') workload[id].done++;
      else if (t.status === 'in_progress' || t.status === 'review') workload[id].inProgress++;
      else workload[id].backlog++;
    }

    // Get member details.
    const members = await db.projectMember.findMany({
      where: { projectId },
      select: { userId: true, role: true, user: { select: { id: true, name: true, avatarColor: true, jobTitle: true } } },
    });

    const result = members.map(m => ({
      user: m.user,
      role: m.role,
      ...(workload[m.userId] ?? { assigned: 0, done: 0, inProgress: 0, backlog: 0, totalDays: 0 }),
    }));

    return NextResponse.json({ workload: result });
  } catch (e) { return authErrorResponse(e); }
}
