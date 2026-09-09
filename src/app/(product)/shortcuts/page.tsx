'use client';

import React from 'react';
import ProjectsPortfolioPage from '../projects/page';
import { KeyboardShortcutsModal } from '@/features/flowdeck/components/ui';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function ShortcutsRoutePage() {
  // Real route = hard navigation (deep link/bookmark/refresh). Closing must
  // stay in-app: push the fallback instead of router.back(), which can exit
  // the site when the previous history entry is not ours (audit Table 5.1).
  const close = useCloseOverlay(routes.projects(), 'fallback-first');

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
