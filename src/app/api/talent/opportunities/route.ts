import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { opportunityDirectorySortSchema } from '@/server/talent/opportunity.schemas';
import { listPublishedOpportunities } from '@/server/talent/opportunity.service';

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') ?? undefined;
    const roleId = searchParams.get('roleId') ?? undefined;
    const skillIdsParam = searchParams.get('skillIds') ?? undefined;
    const skillIds = skillIdsParam
      ? skillIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const budgetType = searchParams.get('budgetType') ?? undefined;
    const minimumBudget = searchParams.get('minimumBudget')
      ? Number(searchParams.get('minimumBudget'))
      : undefined;
    const maximumBudget = searchParams.get('maximumBudget')
      ? Number(searchParams.get('maximumBudget'))
      : undefined;
    const expectedDuration = searchParams.get('expectedDuration') ?? undefined;

    const rawSort = searchParams.get('sort') ?? 'NEWEST';
    const parsedSort = opportunityDirectorySortSchema.safeParse(rawSort);
    const sort = parsedSort.success ? parsedSort.data : 'NEWEST';

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 12));

    const result = await listPublishedOpportunities({
      search,
      roleId,
      skillIds,
      budgetType,
      minimumBudget: minimumBudget && !Number.isNaN(minimumBudget) ? minimumBudget : undefined,
      maximumBudget: maximumBudget && !Number.isNaN(maximumBudget) ? maximumBudget : undefined,
      expectedDuration,
      sort,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'GET /api/talent/opportunities');
  }
}
