import type { PublicProfessionalProfile } from './types';

export function humanizeTalentEnum(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatRate(profile: Pick<PublicProfessionalProfile, 'rateType' | 'minimumRate' | 'maximumRate' | 'currency'>): string {
  if (!profile.rateType) return 'Rate not listed';
  if (profile.rateType === 'NEGOTIABLE') return 'Negotiable';

  const currency = profile.currency ?? '';
  const minimum = profile.minimumRate ? Number(profile.minimumRate).toLocaleString() : null;
  const maximum = profile.maximumRate ? Number(profile.maximumRate).toLocaleString() : null;
  const suffix = profile.rateType === 'HOURLY' ? '/hr' : ' fixed';

  if (minimum && maximum) return `${currency} ${minimum}–${maximum}${suffix}`.trim();
  if (minimum) return `From ${currency} ${minimum}${suffix}`.trim();
  if (maximum) return `Up to ${currency} ${maximum}${suffix}`.trim();
  return humanizeTalentEnum(profile.rateType);
}
