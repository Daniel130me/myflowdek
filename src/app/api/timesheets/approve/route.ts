import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { approveTimesheets } from '@/server/timesheets/timesheet.service';
import { db } from '@/server/db/client';
import { z } from 'zod';

const approveSchema = z.object({ entryIds: z.array(z.string()).min(1) });

/**
 * POST /api/timesheets/approve
 * Approve submitted timesheet entries. Only project OWNER/ADMIN can approve.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json().catch(() => null);
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });

    // Verify the user is a manager (OWNER/ADMIN) on the project of each entry.
    if (parsed.data.entryIds.length > 0) {
      const entries = await db.timesheetEntry.findMany({
        where: { id: { in: parsed.data.entryIds } },
        select: { id: true, projectId: true },
      });
      for (const entry of entries) {
        const membership = await db.projectMember.findUnique({
          where: { projectId_userId: { projectId: entry.projectId, userId: user.id } },
          select: { role: true },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
          return NextResponse.json({ error: 'Only project OWNER/ADMIN can approve timesheets' }, { status: 403 });
        }
      }
    }

    const count = await approveTimesheets(parsed.data.entryIds);
    return NextResponse.json({ approved: count });
  } catch (e) { return authErrorResponse(e); }
}
