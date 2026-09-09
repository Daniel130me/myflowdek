'use client';

import { useSyncExternalStore } from 'react';

/**
 * Viewport breakpoints — single source of truth for the product shell.
 *
 * The mobile boundary is aligned with Tailwind's `md` (768px), which is what
 * the auth layouts already used. It previously sat at 720px, so the same
 * device could be "mobile" in the product yet "desktop" on login
 * (audit Table 4.1). Keep these as named constants — call sites must not
 * sprinkle their own numeric breakpoints.
 */
export const MOBILE_MAX_WIDTH = 768;
/**
 * Historic tablet ceiling. Tailwind's `lg` is 1024 — deliberate divergence
 * kept for now to avoid visual regressions in the 1024–1079 band; revisit
 * only with a visual pass over that range.
 */
export const TABLET_MAX_WIDTH = 1080;

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getSnapshot() {
  return window.innerWidth;
}

/**
 * Server / hydration-pass guess. Any consumer whose layout FORK depends on
 * it must gate on `ready` — see below — otherwise phones commit the
 * desktop fork first and flash after hydration.
 */
function getServerSnapshot() {
  return 1280;
}

/** No-op subscription for the mount flag: it never changes after mount. */
function subscribeNoop() {
  return () => {};
}
function getMounted() {
  return true;
}
function getMountedServer() {
  return false;
}

export function useViewport() {
  const width = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /**
   * True once the component is past the hydration commit and `width` is the
   * measured viewport. useSyncExternalStore serves `getServerSnapshot()`
   * during SSR AND the hydration pass, so without this flag a server-rendered
   * component commits its desktop/mobile fork from the hard-coded 1280 guess
   * — phones painted the wrong shell first (audit Table 4.1).
   *
   * Shell-level consumers (product layout, auth layouts) render a skeleton
   * while `ready` is false; cosmetic-only consumers (padding, chip counts)
   * can keep using isMobile/isTablet directly.
   */
  const ready = useSyncExternalStore(subscribeNoop, getMounted, getMountedServer);

  return {
    width,
    ready,
    isMobile: width < MOBILE_MAX_WIDTH,
    isTablet: width >= MOBILE_MAX_WIDTH && width < TABLET_MAX_WIDTH,
  };
}

/**
 * True when the primary input device can hover (mouse/trackpad).
 *
 * Touch-first devices — tablets in particular: an iPad portrait is exactly
 * 768px wide, so it takes the desktop layout where hover-revealed controls
 * would be invisible yet tappable (audit Table 6.1, Files view). Consumers
 * must show such controls permanently when this returns false.
 */
function subscribeHover(callback: () => void) {
  const query = window.matchMedia('(hover: hover)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
function getHoverSnapshot() {
  return window.matchMedia('(hover: hover)').matches;
}
/** Desktop-first default; touch devices re-render to the visible fork after hydration. */
function getHoverServerSnapshot() {
  return true;
}
export function useHasHover() {
  return useSyncExternalStore(subscribeHover, getHoverSnapshot, getHoverServerSnapshot);
}
