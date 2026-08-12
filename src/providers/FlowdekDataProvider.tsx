'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useFlowDeckStore, FlowDeckState } from '@/features/flowdeck/store/useFlowDeck';

const FlowdekDataContext = createContext<FlowDeckState | null>(null);

export function FlowdekDataProvider({ children }: { children: React.ReactNode }) {
  const value = useFlowDeckStore();
  const { data: session } = useSession();

  // Connect the authenticated session user to the application identity.
  // This replaces the hard-coded CURRENT_USER_ID = 'u5' — the store's
  // currentUserId now comes from session.user.id (the real authenticated
  // user). Falls back to the demo constant when no session is active.
  useEffect(() => {
    if (session?.user?.id) {
      value.setCurrentUserId(session.user.id);
    }
    if (session?.user?.name) {
      value.setCurrentUserName(session.user.name);
    }
  }, [session?.user?.id, session?.user?.name, value]);

  return (
    <FlowdekDataContext.Provider value={value}>
      {children}
    </FlowdekDataContext.Provider>
  );
}

export function useFlowdekData(): FlowDeckState {
  const context = useContext(FlowdekDataContext);
  if (!context) {
    throw new Error('useFlowdekData must be used within a FlowdekDataProvider');
  }
  return context;
}

export function useOptionalFlowdekData(): FlowDeckState | null {
  return useContext(FlowdekDataContext);
}
