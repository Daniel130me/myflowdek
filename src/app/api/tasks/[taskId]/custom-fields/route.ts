import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import {
  listTaskCustomValues,
  setTaskCustomValue,
  findCustomFieldByKey,
  findCustomFieldById,
} from '@/server/custom-fields/custom-field.service';

/**
 * Body for setting a custom-field value. The caller may identify the field
 * either by its server `fieldId` or by its project-unique `key` (which is
 * what the frontend `CustomColumn` carries). At least one must be provided;
 * `fieldId` takes precedence when both are present.
 */
const setCustomValueSchema = z.object({
  fieldId: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  value: z.string().nullable(),
}).refine((v) => Boolean(v.fieldId || v.key), {
  message: 'Either fieldId or key is required',
});

/** GET /api/tasks/:taskId/custom-fields — list custom-field values for a task. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');
    const values = await listTaskCustomValues(taskId);
    return NextResponse.json({ values });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/tasks/:taskId/custom-fields — set a custom-field value.
 *
 * Verifies the task exists, the user has EDIT_TASK on the task's project, and
 * the custom field belongs to the same project as the task (so a caller can't
 * cross-wire a field from another project). Upserts the
 * `TaskCustomFieldValue` row.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'EDIT_TASK');

    const body = await request.json().catch(() => null);
    const parsed = setCustomValueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    // Resolve the fieldId and verify the field belongs to the task's project.
    // If the caller passed fieldId, look it up by id and check project match.
    // Otherwise resolve by (projectId, key) so callers without the server id
    // can still set a value.
    let fieldId: string;
    if (parsed.data.fieldId) {
      const field = await findCustomFieldById(parsed.data.fieldId);
      if (!field || field.projectId !== task.projectId) {
        return NextResponse.json(
          { error: 'Custom field not found in this project' },
          { status: 404 },
        );
      }
      fieldId = field.id;
    } else {
      const field = await findCustomFieldByKey(task.projectId, parsed.data.key!);
      if (!field) {
        return NextResponse.json(
          { error: 'Custom field not found in this project' },
          { status: 404 },
        );
      }
      fieldId = field.id;
    }

    const value = parsed.data.value;
    const upserted = await setTaskCustomValue(taskId, fieldId, value);
    return NextResponse.json({ value: upserted }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
