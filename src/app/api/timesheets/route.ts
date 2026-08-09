import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { listTimesheets, createTimesheet, createTimesheetSchema } from '@/server/timesheets/timesheet.service';

export async function GET(req: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') ?? undefined;
    const startDate = url.searchParams.get('startDate') ?? undefined;
    const endDate = url.searchParams.get('endDate') ?? undefined;
    const submitted = url.searchParams.get('submitted');
    const entries = await listTimesheets(user.id, {
      projectId, startDate, endDate,
      submitted: submitted === 'true' ? true : submitted === 'false' ? false : undefined,
    });
    return NextResponse.json({ entries });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json().catch(() => null);
    const parsed = createTimesheetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const entry = await createTimesheet(user.id, parsed.data);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
