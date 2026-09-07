'use client';

import { LoadErrorPanel } from './load-error';

/** Task-specific wrapper around the shared load-error panel. */
export function TaskLoadError({ onRetry }: { onRetry: () => void }) {
  return <LoadErrorPanel title="Task could not be loaded" onRetry={onRetry} />;
}
