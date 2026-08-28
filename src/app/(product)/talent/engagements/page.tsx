import { Suspense } from 'react';
import { EngagementsDirectory } from '@/features/talent/EngagementsDirectory';
import { TableSkeleton } from '@/components/ui/skeleton';

export default function EngagementsPage() {
  return (
    <Suspense fallback={<div className="p-8"><TableSkeleton /></div>}>
      <EngagementsDirectory />
    </Suspense>
  );
}
