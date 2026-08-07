'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, LoginPage } from '@/features/flowdeck/components/auth';
import { routes } from '@/shared/navigation/routes';

export default function AuthLoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      if (!auth.isOnboarded) {
        router.replace(routes.onboarding());
      } else {
        router.replace(routes.projects());
      }
    }
  }, [auth.ready, auth.isAuthenticated, auth.isOnboarded, router]);

  if (!auth.ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F7F7', color: '#9CA3AF' }}>
        Loading Flowdek…
      </div>
    );
  }

  const handleLogin = async (email: string, password: string, name?: string) => {
    const result = await auth.login(email, password, name);
    if (result.ok) {
      router.push(routes.projects());
    }
    return result;
  };

  const handleDemoLogin = async () => {
    const result = await auth.demoLogin();
    if (result.ok) {
      router.push(routes.projects());
    }
    return result;
  };

  return <LoginPage onLogin={handleLogin} onDemoLogin={handleDemoLogin} />;
}
