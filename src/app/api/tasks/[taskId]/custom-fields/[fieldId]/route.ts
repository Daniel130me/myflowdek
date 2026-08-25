import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import {
  deleteTaskCustomValue,
  findCustomFieldById,
} from '@/server/custom-fields/custom-field.service';

/**
 * DELETE /api/tasks/:taskId/custom-fields/:fieldId — remove a custom-field
 * value from a task.
 *
 * Verifies the task exists, the user has EDIT_TASK on the task's project, and
 * the field belongs to the same project (defense in depth — a caller could
 * otherwise pass a fieldId from another project, though the (taskId, fieldId)
 * unique constraint would prevent the row from existing in the first place).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string; fieldId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId, fieldId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'EDIT_TASK');

    const field = await findCustomFieldById(fieldId);
    if (!field || field.projectId !== task.projectId) {
      return NextResponse.json(
        { error: 'Custom field not found in this project' },
        { status: 404 },
      );
    }

    await deleteTaskCustomValue(taskId, fieldId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
