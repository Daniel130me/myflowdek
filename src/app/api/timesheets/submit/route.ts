import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { submitTimesheets, createTimesheetSchema, createTimesheet } from '@/server/timesheets/timesheet.service';
import { z } from 'zod';

const submitSchema = z.object({ entryIds: z.array(z.string()).min(1) });

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json().catch(() => null);
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const count = await submitTimesheets(user.id, parsed.data.entryIds);
    return NextResponse.json({ submitted: count });
  } catch (e) { return authErrorResponse(e); }
}
