'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useAuth, OnboardingFlow } from '@/features/flowdeck/components/auth';
import { ThemeProvider } from '@/features/flowdeck/hooks/useTheme';
import { routes } from '@/shared/navigation/routes';
import { AuthPageSkeleton } from '@/components/ui/skeleton';

export default function AuthOnboardingPage() {
  const auth = useAuth();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    return <AuthPageSkeleton />;
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
      // Failures must be visible: the wizard stays mounted, so surface both a
      // toast and an inline banner above it (audit H-15 — this used to be a
      // console.error with zero user feedback).
      setSubmitError(result.error ?? 'Something went wrong. Please try again.');
      toast.error(result.error ?? 'Something went wrong. Please try again.');
    }
  };

  const handleComplete = (data: any) => submitOnboarding(data);

  const handleSkip = () =>
    submitOnboarding({
      projectName: '',
      projectColor: '#C2410C',
      projectDesc: '',
      invitedMembers: [],
      preferences: { defaultView: 'dashboard', enableNotifications: true, theme: 'light' },
    });

  return (
    <ThemeProvider>
      {submitError && (
        <div role="alert" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', fontSize: 13.5, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxWidth: 420, textAlign: 'center' }}>
          {submitError}
        </div>
      )}
      <OnboardingFlow
        user={auth.user}
        onComplete={handleComplete}
        onUpdateUser={auth.updateUser}
        onSkip={handleSkip}
      />
    </ThemeProvider>
  );
}
