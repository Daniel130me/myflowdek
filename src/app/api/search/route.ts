import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { search } from '@/server/search/search.service';

/**
 * GET /api/search?q=...&type=...
 *
 * Unified search across projects, tasks, comments, people, and files.
 * Results are scoped to the authenticated user's accessible workspaces
 * (the service filters every category by membership — this route's job is
 * to validate the inputs and hand the authenticated user id through).
 *
 * Query params:
 *   q    — the search query (min 2 chars; anything beyond 200 is clamped so
 *          an oversized query cannot drive five unbounded `contains` scans)
 *   type — optional filter: 'projects' | 'tasks' | 'comments' | 'people' | 'files'
 *          (if omitted, returns all categories)
 */
const searchParamsSchema = z.object({
  q: z.string().max(200).optional().default(''),
  type: z.enum(['projects', 'tasks', 'comments', 'people', 'files']).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const parsed = searchParamsSchema.safeParse({
      q: url.searchParams.get('q') ?? '',
      type: url.searchParams.get('type') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters' },
        { status: 400 },
      );
    }

    const results = await search(user.id, parsed.data.q);

    // If a specific type is requested, return only that category.
    const { type } = parsed.data;
    if (type) {
      return NextResponse.json({ results: results[type] });
    }

    return NextResponse.json(results);
  } catch (error) {
    return authErrorResponse(error);
  }
}
