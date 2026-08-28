'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/flowdeck/components/auth';
import { routes } from '@/shared/navigation/routes';
import { RootPageSkeleton } from '@/components/ui/skeleton';

export default function RootEntryPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.isAuthenticated) {
      router.replace(routes.login());
    } else if (!auth.isOnboarded) {
      router.replace(routes.onboarding());
    } else {
      router.replace(routes.projects());
    }
  }, [auth.ready, auth.isAuthenticated, auth.isOnboarded, router]);

  return <RootPageSkeleton />;
}
