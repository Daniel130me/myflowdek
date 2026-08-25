import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  authErrorResponse,
} from '@/server/auth/authorization';
import { search } from '@/server/search/search.service';

/**
 * GET /api/search?q=...&type=...
 *
 * Unified search across projects, tasks, comments, people, and files.
 * Results are scoped to the authenticated user's accessible workspaces.
 *
 * Query params:
 *   q    — the search query (min 2 characters)
 *   type — optional filter: 'projects' | 'tasks' | 'comments' | 'people' | 'files'
 *          (if omitted, returns all categories)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    const type = url.searchParams.get('type');

    const results = await search(user.id, q);

    // If a specific type is requested, return only that category.
    if (type && type in results) {
      return NextResponse.json({ results: results[type as keyof typeof results] });
    }

    return NextResponse.json(results);
  } catch (error) {
    return authErrorResponse(error);
  }
}
