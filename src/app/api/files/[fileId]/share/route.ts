import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { shareFileWithTeammate } from '@/server/files/file.service';

const shareSchema = z.object({
  email: z.string().email('Valid email address is required'),
  role: z.enum(['reader', 'writer']).default('reader'),
});

/**
 * POST /api/files/:fileId/share — share a connected-provider file with a
 * teammate via the provider's permissions API (e.g. Google Drive).
 *
 * Authorization:
 *   - The caller must be the file owner OR have MANAGE_MEMBERS capability
 *     (ADMIN/OWNER). Ordinary VIEWERs and MEMBERs cannot share files —
 *     this prevents them from mutating another user's Google Drive
 *     permissions.
 *   - The service also validates the target email is a project/workspace
 *     member (no arbitrary external emails).
 *   - The caller's own OAuth connection is used — NOT the file owner's.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;

    const file = await db.file.findUnique({ where: { id: fileId }, select: { projectId: true, uploadedById: true } });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Require MANAGE_MEMBERS for non-owners. The file owner can share
    // their own files without a capability check (they own the file).
    if (file.uploadedById !== user.id) {
      await requireProjectCapability(user.id, file.projectId, 'MANAGE_MEMBERS');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    await shareFileWithTeammate(fileId, user.id, parsed.data.email, parsed.data.role);

    return NextResponse.json({ ok: true, message: `Permission granted in provider for ${parsed.data.email}` });
  } catch (error) {
    return authErrorResponse(error);
  }
}
