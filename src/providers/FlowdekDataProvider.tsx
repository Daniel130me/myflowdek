'use client';

import React, { createContext, useContext } from 'react';
import { useFlowDeckStore, FlowDeckState, fallbackFlowDeckState } from '@/features/flowdeck/store/useFlowDeck';

const FlowdekDataContext = createContext<FlowDeckState | null>(null);

export function FlowdekDataProvider({ children }: { children: React.ReactNode }) {
  const value = useFlowDeckStore();
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
