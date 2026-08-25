import { Prisma } from '@prisma/client';

export const publicProfessionalProfileSelect = Prisma.validator<Prisma.ProfessionalProfileSelect>()({
  id: true,
  slug: true,
  professionalTitle: true,
  bio: true,
  yearsOfExperience: true,
  location: true,
  timezone: true,
  remotePreference: true,
  rateType: true,
  minimumRate: true,
  maximumRate: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { name: true, avatarColor: true } },
  availability: {
    select: {
      status: true,
      weeklyAvailableHours: true,
      availableFrom: true,
    },
  },
  roles: {
    orderBy: { role: { sortOrder: 'asc' } },
    select: {
      role: { select: { id: true, slug: true, name: true, description: true } },
    },
  },
  skills: {
    orderBy: { skill: { sortOrder: 'asc' } },
    select: {
      proficiency: true,
      isVerified: true,
      skill: { select: { id: true, slug: true, name: true, category: true, description: true } },
    },
  },
  portfolioItems: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  },
});

export type PublicProfessionalProfileRecord = Prisma.ProfessionalProfileGetPayload<{
  select: typeof publicProfessionalProfileSelect;
}>;

export function toPublicProfessionalProfileDto(profile: PublicProfessionalProfileRecord) {
  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.user.name ?? 'Flowdek Professional',
    avatarColor: profile.user.avatarColor,
    professionalTitle: profile.professionalTitle,
    bio: profile.bio,
    yearsOfExperience: profile.yearsOfExperience,
    location: profile.location,
    timezone: profile.timezone,
    remotePreference: profile.remotePreference,
    rateType: profile.rateType,
    minimumRate: profile.minimumRate?.toString() ?? null,
    maximumRate: profile.maximumRate?.toString() ?? null,
    currency: profile.currency,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    availability: profile.availability
      ? {
          ...profile.availability,
          availableFrom: profile.availability.availableFrom?.toISOString() ?? null,
        }
      : null,
    roles: profile.roles.map(({ role }) => role),
    skills: profile.skills.map(({ skill, ...declaration }) => ({ ...skill, ...declaration })),
    portfolioItems: profile.portfolioItems.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export type PublicProfessionalProfileDto = ReturnType<typeof toPublicProfessionalProfileDto>;
