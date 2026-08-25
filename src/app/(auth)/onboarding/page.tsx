'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth, OnboardingFlow } from '@/features/flowdeck/components/auth';
import { ThemeProvider } from '@/features/flowdeck/hooks/useTheme';
import { routes } from '@/shared/navigation/routes';

export default function AuthOnboardingPage() {
  const auth = useAuth();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [submitting, setSubmitting] = useState(false);

  // Redirect unauthenticated users to login; fully-onboarded users to the app.
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

  // Persist onboarding server-side, then refresh the session so the JWT
  // carries the new onboardedAt timestamp, then navigate to the app.
  const submitOnboarding = async (data: any) => {
    setSubmitting(true);
    const result = await auth.completeOnboarding(data);
    if (result.ok) {
      // Refetch the session so `isOnboarded` flips to true before navigate.
      await updateSession();
      router.push(routes.projects());
    } else {
      setSubmitting(false);
      // On error the wizard stays mounted; the OnboardingFlow can surface the
      // message via a toast (not wired here to keep the diff minimal).
      console.error('[onboarding] failed:', result.error);
    }
  };

  const handleComplete = (data: any) => submitOnboarding(data);

  const handleSkip = () =>
    submitOnboarding({
      projectName: '',
      projectColor: '#FE8029',
      projectDesc: '',
      invitedMembers: [],
      preferences: { defaultView: 'dashboard', enableNotifications: true, theme: 'light' },
    });

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
