export type ProfileStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
export type ProfileVisibility = 'PRIVATE' | 'FLOWDEK_USERS';
export type RemotePreference = 'REMOTE_ONLY' | 'HYBRID' | 'ONSITE' | 'FLEXIBLE';
export type RateType = 'HOURLY' | 'FIXED' | 'NEGOTIABLE';
export type AvailabilityStatus = 'AVAILABLE_NOW' | 'AVAILABLE_SOON' | 'LIMITED' | 'UNAVAILABLE';
export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface ProfessionalRoleOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface SkillOption {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
}

export interface DeclaredSkill extends SkillOption {
  proficiency: ProficiencyLevel;
  isVerified: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalProfile {
  id: string;
  slug: string;
  professionalTitle: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  visibility: ProfileVisibility;
  status: ProfileStatus;
  location: string | null;
  timezone: string | null;
  remotePreference: RemotePreference | null;
  rateType: RateType | null;
  minimumRate: string | null;
  maximumRate: string | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
  availability: {
    id: string;
    status: AvailabilityStatus;
    weeklyAvailableHours: number | null;
    availableFrom: string | null;
  } | null;
  roles: ProfessionalRoleOption[];
  skills: DeclaredSkill[];
  portfolioItems: PortfolioItem[];
}

export async function readApiMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;
  return 'Something went wrong. Please try again.';
}
