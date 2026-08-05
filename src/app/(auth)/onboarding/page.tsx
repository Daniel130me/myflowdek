'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, OnboardingFlow } from '@/features/flowdeck/components/auth';
import { ThemeProvider } from '@/features/flowdeck/hooks/useTheme';
import { routes } from '@/shared/navigation/routes';

export default function AuthOnboardingPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready) {
      if (!auth.isAuthenticated) {
        router.replace(routes.login());
      } else if (auth.isOnboarded) {
        router.replace(routes.projects());
      }
    }
  }, [auth.ready, auth.isAuthenticated, auth.isOnboarded, router]);

  if (!auth.ready || !auth.user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F7F7', color: '#9CA3AF' }}>
        Loading Flowdek…
      </div>
    );
  }

  const handleComplete = (data: any) => {
    auth.completeOnboarding(data);
    router.push(routes.projects());
  };

  const handleSkip = () => {
    auth.completeOnboarding({
      projectName: '',
      projectColor: '#FE8029',
      projectDesc: '',
      invitedMembers: [],
      preferences: { defaultView: 'dashboard', enableNotifications: true, theme: 'light' },
    });
    router.push(routes.projects());
  };

  return (
    <ThemeProvider>
      <OnboardingFlow
        user={auth.user}
        onComplete={handleComplete}
        onUpdateUser={auth.updateUser}
        onSkip={handleSkip}
      />
    </ThemeProvider>
  );
}
