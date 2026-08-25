'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ProjectsPortfolioPage from '../projects/page';
import { KeyboardShortcutsModal } from '@/features/flowdeck/components/ui';

export default function ShortcutsRoutePage() {
  const router = useRouter();
  const close = () => router.back();

  return (
    <>
      <ProjectsPortfolioPage />
      <KeyboardShortcutsModal
        open={true}
        onClose={close}
      />
    </>
  );
}
