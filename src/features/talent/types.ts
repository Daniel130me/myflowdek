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

export interface PublicProfessionalProfile {
  id: string;
  slug: string;
  displayName: string;
  avatarColor: string | null;
  professionalTitle: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  location: string | null;
  timezone: string | null;
  remotePreference: RemotePreference | null;
  rateType: RateType | null;
  minimumRate: string | null;
  maximumRate: string | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
  availability: ProfessionalProfile['availability'];
  roles: ProfessionalRoleOption[];
  skills: DeclaredSkill[];
  portfolioItems: PortfolioItem[];
}

export interface ProfessionalDirectoryResponse {
  profiles: PublicProfessionalProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

export type ProfessionalDirectorySort =
  | 'RELEVANCE'
  | 'NEWEST'
  | 'RATE_LOW_TO_HIGH'
  | 'RATE_HIGH_TO_LOW';

export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED' | 'CANCELLED';
export type ProposalStatus = 'SUBMITTED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type OpportunityDirectorySort =
  | 'NEWEST'
  | 'BUDGET_HIGH_TO_LOW'
  | 'BUDGET_LOW_TO_HIGH'
  | 'DEADLINE_SOONEST';

export interface OpportunitySkillRequirement {
  id: string;
  minimumProficiency: ProficiencyLevel;
  isRequired: boolean;
  notes: string | null;
  skill: {
    id: string;
    slug: string;
    name: string;
    category: string;
  };
}

export interface PublicOpportunity {
  id: string;
  taskId: string;
  status: OpportunityStatus;
  title: string;
  description: string;
  deliverablesSummary: string | null;
  budgetType: RateType | null;
  minimumBudget: string | null;
  maximumBudget: string | null;
  currency: string | null;
  expectedDuration: string | null;
  applicationDeadline: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  proposalsCount: number;
  requiredSkills: OpportunitySkillRequirement[];
  createdBy: {
    id: string;
    displayName: string;
    avatarColor: string | null;
  };
}

export interface OpportunityDirectoryResponse {
  opportunities: PublicOpportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

export interface TalentProposalDto {
  id: string;
  opportunityId: string;
  proposedPrice: string;
  currency: string;
  estimatedDuration: string;
  coverMessage: string;
  proposedApproach: string | null;
  milestoneSuggestions: any;
  status: ProposalStatus;
  submittedAt: string;
  reviewedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  professional: {
    id: string;
    slug: string;
    displayName: string;
    avatarColor: string | null;
    professionalTitle: string | null;
    location: string | null;
    timezone: string | null;
    remotePreference: RemotePreference | null;
    roles: string[];
    skills: {
      id: string;
      name: string;
      slug: string;
      category: string;
      proficiency: ProficiencyLevel;
    }[];
  };
  opportunity?: {
    id: string;
    title: string;
    status: OpportunityStatus;
    budgetType: RateType | null;
    minimumBudget: string | null;
    maximumBudget: string | null;
    currency: string | null;
    applicationDeadline: string | null;
  };
}

export async function readApiMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;
  return 'Something went wrong. Please try again.';
}
