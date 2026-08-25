import { EngagementWorkspace } from '@/features/talent/EngagementWorkspace';

interface EngagementPageProps {
  params: Promise<{ engagementId: string }>;
}

export default async function EngagementPage({ params }: EngagementPageProps) {
  const { engagementId } = await params;
  return <EngagementWorkspace engagementId={engagementId} />;
}
