'use client';

import React from 'react';
import { KeyboardShortcutsModal } from '@/features/flowdeck/components/ui';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';

export default function InterceptedShortcutsPage() {
  const close = useCloseOverlay();

  return (
    <KeyboardShortcutsModal
      open={true}
      onClose={close}
    />
  );
}
