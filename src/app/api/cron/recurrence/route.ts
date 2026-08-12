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
 */
export async function POST(request: Request) {
  // Verify the cron secret.
  const cronSecret = process.env.CRON_SECRET;
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
