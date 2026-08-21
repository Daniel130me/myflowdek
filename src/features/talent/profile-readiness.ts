import type { ProfessionalProfile } from './types';

export function getProfileReadiness(profile: ProfessionalProfile): string[] {
  const issues: string[] = [];
  if (!profile.professionalTitle?.trim()) issues.push('Professional title');
  if (!profile.bio || profile.bio.trim().length < 80) issues.push('Bio of at least 80 characters');
  if (profile.yearsOfExperience == null) issues.push('Years of experience');
  if (!profile.location?.trim()) issues.push('Location');
  if (!profile.timezone?.trim()) issues.push('Timezone');
  if (!profile.remotePreference) issues.push('Work preference');
  if (profile.roles.length === 0) issues.push('At least one role');
  if (profile.skills.length === 0) issues.push('At least one skill');
  if (!profile.availability) issues.push('Availability');
  if (!profile.rateType) issues.push('Rate type');
  if (!profile.currency) issues.push('Currency');
  if ((profile.rateType === 'HOURLY' || profile.rateType === 'FIXED') && profile.minimumRate == null) {
    issues.push('Minimum rate');
  }
  if ((profile.rateType === 'HOURLY' || profile.rateType === 'FIXED') && profile.maximumRate == null) {
    issues.push('Maximum rate');
  }
  return issues;
}

export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return 'Not set';
  return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
