import type { Metadata } from 'next';

import { TalentOpportunityDetail } from '@/features/talent/TalentOpportunityDetail';

export const metadata: Metadata = {
  title: 'Opportunity Detail | Flowdek Talent Network',
  description: 'View task scope, required competencies, and submit proposals.',
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  return <TalentOpportunityDetail opportunityId={opportunityId} />;
}
