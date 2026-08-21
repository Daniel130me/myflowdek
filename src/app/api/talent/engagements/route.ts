import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import {
  createEngagementSchema,
  listEngagementsQuerySchema,
} from '@/server/talent/engagement.schemas';
import {
  createDraftEngagement,
  listUserEngagements,
} from '@/server/talent/engagement.service';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(req.url);

    const parsedQuery = listEngagementsQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      return validationError(parsedQuery.error);
    }

    const result = await listUserEngagements(user.id, parsedQuery.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'GET /api/talent/engagements');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json().catch(() => null);

    const parsed = createEngagementSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const created = await createDraftEngagement(user.id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements');
  }
}
