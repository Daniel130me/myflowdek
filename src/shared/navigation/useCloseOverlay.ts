'use client';

import { useRouter } from 'next/navigation';

export function useCloseOverlay(fallbackRoute?: string) {
  const router = useRouter();

  return function closeOverlay() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (fallbackRoute) {
      router.push(fallbackRoute);
    } else {
      router.back();
    }
  };
}
