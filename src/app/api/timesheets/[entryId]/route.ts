import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { deleteTimesheet, updateTimesheet, updateTimesheetSchema } from '@/server/timesheets/timesheet.service';

/**
 * PATCH /api/timesheets/:entryId
 *
 * Update a timesheet entry's editable fields (hours, note, date). Only the
 * owner can edit, and only if the entry has not yet been submitted for
 * approval (enforced by `updateTimesheet`).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { entryId } = await params;

    const body = await req.json().catch(() => null);
    const parsed = updateTimesheetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const entry = await updateTimesheet(entryId, user.id, parsed.data);
    return NextResponse.json({ entry });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/timesheets/:entryId
 *
 * Delete a timesheet entry. Only the owner can delete, and only if the entry
 * has not been submitted for approval.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { entryId } = await params;
    await deleteTimesheet(entryId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
