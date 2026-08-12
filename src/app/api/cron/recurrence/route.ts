import { NextResponse } from 'next/server';
import { processRecurringTasks } from '@/server/tasks/recurrence.service';

/**
 * POST /api/cron/recurrence
 *
 * Cron endpoint for processing recurring tasks. Intended to be called by
 * a scheduled job (Vercel Cron, Render Cron, or external scheduler) every
 * hour. Finds recently-completed recurring tasks and creates their next
 * occurrences.
 *
 * Security: requires a CRON_SECRET header to prevent unauthorized calls.
 * Set CRON_SECRET in the environment and pass it as the
 * x-cron-secret header when calling this endpoint.
 *
 * Fail-closed: in production, if CRON_SECRET is unset, the endpoint refuses
 * to run (503). A missing secret must NEVER open the door to anonymous
 * callers — otherwise a misconfigured prod deployment would let anyone
 * trigger recurrence processing. In non-production (dev/test), the secret
 * is optional so the route can be exercised locally.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // Fail closed: production deployments MUST configure CRON_SECRET.
  if (isProduction && !cronSecret) {
    console.error('[cron/recurrence] CRON_SECRET is not set in production — refusing to run');
    return NextResponse.json(
      { error: 'Cron secret not configured' },
      { status: 503 },
    );
  }

  // Verify the cron secret (when configured).
  if (cronSecret) {
    const headerSecret = request.headers.get('x-cron-secret');
    if (headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const created = await processRecurringTasks();
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error('[cron/recurrence] error:', error);
    return NextResponse.json(
      { error: 'Recurrence processing failed' },
      { status: 500 },
    );
  }
}
