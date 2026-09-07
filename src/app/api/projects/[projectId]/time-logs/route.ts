import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';

/** Fields exposed to the client — mirrors the per-task time-log route. */
const timeLogSelect = {
  id: true,
  taskId: true,
  userId: true,
  minutes: true,
  note: true,
  loggedAt: true,
} as const;

/**
 * GET /api/projects/:projectId/time-logs — list every time log in a project.
 *
 * One query for the whole project so store-hydrating surfaces (task detail
 * Time Tracking, team workload) avoid N+1 per-task fetches (audit H-09:
 * time logs were never fetched at all, so logged work vanished on reload).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'VIEW_PROJECT');

    const timeLogs = await db.timeLog.findMany({
      where: { task: { projectId } },
      select: timeLogSelect,
      orderBy: { loggedAt: 'asc' },
    });
    return NextResponse.json({ timeLogs });
  } catch (error) {
    return authErrorResponse(error);
  }
}
