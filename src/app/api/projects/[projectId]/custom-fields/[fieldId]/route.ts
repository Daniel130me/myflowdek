import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { deleteCustomField } from '@/server/custom-fields/custom-field.service';
import { db } from '@/server/db/client';

/**
 * DELETE /api/projects/:projectId/custom-fields/:fieldId — delete a custom-
 * field definition.
 *
 * The schema cascades deletion to all `TaskCustomFieldValue` rows pointing at
 * this field, so a single delete clears both the definition and every value
 * across all tasks in the project. Requires MANAGE_CUSTOM_FIELDS.
 *
 * The route verifies the field belongs to the path's projectId before
 * dispatching — without this, a caller could pass a fieldId from another
 * project and delete it (the service uses a bare `delete({ where: { id } })`
 * which has no project scoping).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; fieldId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, fieldId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_CUSTOM_FIELDS');

    const field = await db.customField.findUnique({
      where: { id: fieldId },
      select: { projectId: true },
    });
    if (!field || field.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Custom field not found in this project' },
        { status: 404 },
      );
    }

    await deleteCustomField(fieldId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
