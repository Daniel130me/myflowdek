import { TalentProfessionalDetail } from '@/features/talent/TalentProfessionalDetail';

export default async function TalentProfessionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TalentProfessionalDetail slug={slug} />;
}
