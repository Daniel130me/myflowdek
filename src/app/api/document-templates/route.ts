import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { listDocumentTemplates } from '@/server/documents/template.service';

const querySchema = z.object({
  phase: z.enum(['INITIATION', 'PLANNING', 'EXECUTION_MONITORING', 'CLOSING']).optional(),
  search: z.string().trim().max(100).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      phase: url.searchParams.get('phase') || undefined,
      search: url.searchParams.get('search') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid filter' }, { status: 400 });
    }
    const templates = await listDocumentTemplates(parsed.data);
    return NextResponse.json({ templates });
  } catch (error) {
    return authErrorResponse(error);
  }
}