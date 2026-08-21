import { Prisma } from '@prisma/client';

export const safeProfessionalProfileSelect = Prisma.validator<Prisma.ProfessionalProfileSelect>()({
  id: true,
  slug: true,
  professionalTitle: true,
  bio: true,
  yearsOfExperience: true,
  visibility: true,
  status: true,
  location: true,
  timezone: true,
  remotePreference: true,
  rateType: true,
  minimumRate: true,
  maximumRate: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
  availability: {
    select: {
      id: true,
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

export type SafeProfessionalProfileRecord = Prisma.ProfessionalProfileGetPayload<{
  select: typeof safeProfessionalProfileSelect;
}>;

export function toProfessionalProfileDto(profile: SafeProfessionalProfileRecord) {
  return {
    ...profile,
    minimumRate: profile.minimumRate?.toString() ?? null,
    maximumRate: profile.maximumRate?.toString() ?? null,
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

export type ProfessionalProfileDto = ReturnType<typeof toProfessionalProfileDto>;
