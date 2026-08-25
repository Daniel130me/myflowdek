'use client';

import { useSyncExternalStore, useCallback } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getSnapshot() {
  return window.innerWidth;
}

function getServerSnapshot() {
  return 1280;
}

export function useViewport() {
  const width = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { width, isMobile: width < 720, isTablet: width >= 720 && width < 1080 };
}
