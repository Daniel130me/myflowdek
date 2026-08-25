import { Suspense } from 'react';
import type { Metadata } from 'next';

import { TalentOpportunitiesDirectory } from '@/features/talent/TalentOpportunitiesDirectory';

export const metadata: Metadata = {
  title: 'Task Opportunities | Flowdek Talent Network',
  description: 'Browse and apply for open task opportunities posted by Flowdek project teams.',
};

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground font-medium">
            Loading opportunities...
          </div>
        </div>
      }
    >
      <TalentOpportunitiesDirectory />
    </Suspense>
  );
}
