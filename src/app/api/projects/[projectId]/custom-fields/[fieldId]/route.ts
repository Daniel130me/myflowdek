import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  deleteCustomField,
  renameCustomField,
  renameCustomFieldSchema,
} from '@/server/custom-fields/custom-field.service';
import { db } from '@/server/db/client';

/**
 * Resolve a custom-field definition and verify it belongs to the path's
 * project. Shared by PATCH and DELETE — without this check a caller could
 * pass a fieldId from another project and mutate it (the service functions
 * use a bare `where: { id }` which has no project scoping).
 */
async function findProjectFieldOr404(projectId: string, fieldId: string) {
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
  return null;
}

/**
 * PATCH /api/projects/:projectId/custom-fields/:fieldId — rename a custom-
 * field definition in place.
 *
 * Label-only update: the key, type and all TaskCustomFieldValue rows are
 * preserved, so renaming can never destroy data. Requires MANAGE_CUSTOM_FIELDS.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; fieldId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, fieldId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_CUSTOM_FIELDS');

    const notFound = await findProjectFieldOr404(projectId, fieldId);
    if (notFound) return notFound;

    const parsed = renameCustomFieldSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'A label between 1 and 100 characters is required' },
        { status: 400 },
      );
    }

    const field = await renameCustomField(fieldId, parsed.data);
    return NextResponse.json({ field });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/:projectId/custom-fields/:fieldId — delete a custom-
 * field definition.
 *
 * The schema cascades deletion to all `TaskCustomFieldValue` rows pointing at
 * this field, so a single delete clears both the definition and every value
 * across all tasks in the project. Requires MANAGE_CUSTOM_FIELDS.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; fieldId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, fieldId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_CUSTOM_FIELDS');

    const notFound = await findProjectFieldOr404(projectId, fieldId);
    if (notFound) return notFound;

    await deleteCustomField(fieldId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
