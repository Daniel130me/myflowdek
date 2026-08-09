import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { listSavedFilters, createSavedFilter, createSavedFilterSchema } from '@/server/saved-filters/saved-filter.service';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const filters = await listSavedFilters(user.id);
    return NextResponse.json({ filters });
  } catch (e) { return authErrorResponse(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json().catch(() => null);
    const parsed = createSavedFilterSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
    const filter = await createSavedFilter(user.id, parsed.data);
    return NextResponse.json({ filter }, { status: 201 });
  } catch (e) { return authErrorResponse(e); }
}
