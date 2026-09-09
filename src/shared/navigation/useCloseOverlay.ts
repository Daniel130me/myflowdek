'use client';

import { useRouter } from 'next/navigation';

/**
 * How the overlay should close.
 *
 * - 'back-first'      — for INTERCEPTED routes (@modal soft-navigation
 *                       overlays). Next.js only renders an intercept on an
 *                       in-app navigation, so a history entry behind the
 *                       overlay is guaranteed to belong to the app:
 *                       router.back() returns to it.
 * - 'fallback-first'  — for REAL overlay routes reached by hard navigation
 *                       (direct URL, bookmark, email link, refresh). The
 *                       previous history entry belongs to whatever the tab
 *                       was doing before — often another site — and
 *                       history.length is browser-wide, so router.back()
 *                       can navigate OUT of the app (audit Table 5.1).
 *                       Push the fallback route instead; back() remains
 *                       the last resort when no fallback exists.
 */
export type CloseOverlayStrategy = 'back-first' | 'fallback-first';

export function useCloseOverlay(fallbackRoute?: string, strategy: CloseOverlayStrategy = 'back-first') {
  const router = useRouter();

  return function closeOverlay() {
    if (strategy === 'fallback-first' && fallbackRoute) {
      router.push(fallbackRoute);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (fallbackRoute) {
      router.push(fallbackRoute);
    } else {
      router.back();
    }
  };
}
