import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuthenticatedUser, requireProjectCapability } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { shareFileWithTeammate } from '@/server/files/file.service';

const shareSchema = z.object({
  email: z.string().email('Valid email address is required'),
  role: z.enum(['reader', 'writer']).default('reader'),
});

/** POST /api/files/:fileId/share — share file with teammate via provider permission API */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { fileId } = await params;

    const file = await db.file.findUnique({ where: { id: fileId }, select: { projectId: true } });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await requireProjectCapability(user.id, file.projectId, 'VIEW_PROJECT');

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
