import { Suspense } from 'react';
import { EngagementsDirectory } from '@/features/talent/EngagementsDirectory';

export default function EngagementsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading engagements...</div>}>
      <EngagementsDirectory />
    </Suspense>
  );
}
