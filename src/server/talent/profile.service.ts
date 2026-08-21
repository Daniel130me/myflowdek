import type { Prisma } from '@prisma/client';

import { audit } from '@/server/audit/log';
import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import type {
  PortfolioItemInput,
  UpdatePortfolioItemInput,
  UpdateProfessionalProfileInput,
} from './profile.schemas';
import {
  safeProfessionalProfileSelect,
  toProfessionalProfileDto,
  type SafeProfessionalProfileRecord,
} from './profile.select';
import { toTaxonomySlug } from './taxonomy';

const portfolioItemSelect = {
  id: true,
  title: true,
  description: true,
  url: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PortfolioItemSelect;

function buildProfileSlug(displayName: string | undefined, userId: string): string {
  const namePart = toTaxonomySlug(displayName?.trim() || 'professional');
  return `${namePart}-${userId.slice(-10).toLowerCase()}`;
}

function serializePortfolioItem(item: {
  id: string;
  title: string;
  description: string | null;
  url: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function getOwnProfessionalProfile(userId: string) {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: safeProfessionalProfileSelect,
  });
  return profile ? toProfessionalProfileDto(profile) : null;
}

/** Explicit opt-in: account creation never calls this function. */
export async function createProfessionalProfile(user: { id: string; name?: string }) {
  const profile = await db.professionalProfile.create({
    data: {
      userId: user.id,
      slug: buildProfileSlug(user.name, user.id),
      availability: { create: {} },
    },
    select: safeProfessionalProfileSelect,
  });

  await audit({ userId: user.id, action: 'talent_profile_created', meta: { profileId: profile.id } });
  return toProfessionalProfileDto(profile);
}

async function validateTaxonomySelections(
  input: Pick<UpdateProfessionalProfileInput, 'roleIds' | 'skills'>,
): Promise<void> {
  const skillIds = input.skills?.map(({ skillId }) => skillId);
  const [activeRoleCount, activeSkillCount] = await Promise.all([
    input.roleIds
      ? db.professionalRole.count({ where: { id: { in: input.roleIds }, isActive: true } })
      : Promise.resolve(undefined),
    skillIds
      ? db.skill.count({ where: { id: { in: skillIds }, isActive: true } })
      : Promise.resolve(undefined),
  ]);

  if (input.roleIds && activeRoleCount !== input.roleIds.length) {
    throw new ServiceError('One or more selected professional roles are unavailable.', 400);
  }
  if (skillIds && activeSkillCount !== skillIds.length) {
    throw new ServiceError('One or more selected skills are unavailable.', 400);
  }
}

export async function updateOwnProfessionalProfile(
  userId: string,
  input: UpdateProfessionalProfileInput,
) {
  await validateTaxonomySelections(input);

  // Prisma executes nested relation replacement and the scalar update in one
  // database transaction, avoiding a latency-sensitive interactive transaction.
  const profile = await db.professionalProfile.update({
    where: { userId },
    data: {
      professionalTitle: input.professionalTitle,
      bio: input.bio,
      yearsOfExperience: input.yearsOfExperience,
      location: input.location,
      timezone: input.timezone,
      remotePreference: input.remotePreference,
      rateType: input.rateType,
      minimumRate: input.minimumRate,
      maximumRate: input.maximumRate,
      currency: input.currency,
      availability: input.availability
        ? {
            upsert: {
              create: {
                status: input.availability.status,
                weeklyAvailableHours: input.availability.weeklyAvailableHours,
                availableFrom: input.availability.availableFrom
                  ? new Date(input.availability.availableFrom)
                  : null,
              },
              update: {
                status: input.availability.status,
                weeklyAvailableHours: input.availability.weeklyAvailableHours,
                availableFrom: input.availability.availableFrom
                  ? new Date(input.availability.availableFrom)
                  : null,
              },
            },
          }
        : undefined,
      roles: input.roleIds
        ? {
            deleteMany: {},
            createMany: { data: input.roleIds.map((roleId) => ({ roleId })) },
          }
        : undefined,
      skills: input.skills
        ? {
            deleteMany: {},
            createMany: {
              data: input.skills.map(({ skillId, proficiency }) => ({
                skillId,
                proficiency,
                isVerified: false,
              })),
            },
          }
        : undefined,
    },
    select: safeProfessionalProfileSelect,
  });

  await audit({ userId, action: 'talent_profile_updated', meta: { profileId: profile.id } });
  return toProfessionalProfileDto(profile);
}

export function getPublishReadinessIssues(profile: SafeProfessionalProfileRecord): string[] {
  const issues: string[] = [];
  if (!profile.professionalTitle?.trim()) issues.push('Add a professional title.');
  if (!profile.bio || profile.bio.trim().length < 80) issues.push('Add a bio of at least 80 characters.');
  if (profile.yearsOfExperience == null) issues.push('Add your years of experience.');
  if (!profile.location?.trim()) issues.push('Add your location.');
  if (!profile.timezone?.trim()) issues.push('Add your timezone.');
  if (!profile.remotePreference) issues.push('Choose a remote-work preference.');
  if (profile.roles.length === 0) issues.push('Choose at least one professional role.');
  if (profile.skills.length === 0) issues.push('Add at least one skill.');
  if (!profile.availability) issues.push('Add your availability.');
  if (!profile.rateType) issues.push('Choose a rate type.');
  if (!profile.currency) issues.push('Add a billing currency.');

  if (profile.rateType === 'HOURLY' || profile.rateType === 'FIXED') {
    if (profile.minimumRate == null) issues.push('Add a minimum rate.');
    if (profile.maximumRate == null) issues.push('Add a maximum rate.');
  }

  if (
    profile.minimumRate != null &&
    profile.maximumRate != null &&
    profile.minimumRate.greaterThan(profile.maximumRate)
  ) {
    issues.push('Maximum rate must be greater than or equal to minimum rate.');
  }
  return issues;
}

export async function publishOwnProfessionalProfile(userId: string) {
  const current = await db.professionalProfile.findUnique({
    where: { userId },
    select: safeProfessionalProfileSelect,
  });
  if (!current) throw new ServiceError('Create your professional profile first.', 404);
  if (current.status === 'SUSPENDED') {
    throw new ServiceError('This professional profile is suspended.', 403);
  }

  const issues = getPublishReadinessIssues(current);
  if (issues.length > 0) {
    throw new ServiceError(`Complete your profile before publishing: ${issues.join(' ')}`, 400);
  }

  // Optimistic concurrency keeps the readiness check and publish decision
  // consistent without holding an interactive transaction over a remote DB.
  const published = await db.professionalProfile.updateMany({
    where: { id: current.id, updatedAt: current.updatedAt, status: { not: 'SUSPENDED' } },
    data: { status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' },
  });
  if (published.count !== 1) {
    throw new ServiceError('Your profile changed while publishing. Review it and try again.', 409);
  }

  const profile = await db.professionalProfile.findUniqueOrThrow({
    where: { id: current.id },
    select: safeProfessionalProfileSelect,
  });

  await audit({ userId, action: 'talent_profile_published', meta: { profileId: profile.id } });
  return toProfessionalProfileDto(profile);
}

export async function unpublishOwnProfessionalProfile(userId: string) {
  const current = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  if (!current) throw new ServiceError('Create your professional profile first.', 404);
  if (current.status === 'SUSPENDED') {
    throw new ServiceError('This professional profile is suspended.', 403);
  }

  const profile = await db.professionalProfile.update({
    where: { id: current.id },
    data: { status: 'DRAFT', visibility: 'PRIVATE' },
    select: safeProfessionalProfileSelect,
  });
  await audit({ userId, action: 'talent_profile_unpublished', meta: { profileId: profile.id } });
  return toProfessionalProfileDto(profile);
}

export async function listProfessionalRoles() {
  return db.professionalRole.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, description: true },
  });
}

export async function listSkills() {
  return db.skill.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, category: true, description: true },
  });
}

export async function createPortfolioItem(userId: string, input: PortfolioItemInput) {
  const profile = await db.professionalProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new ServiceError('Create your professional profile first.', 404);

  const item = await db.portfolioItem.create({
    data: { profileId: profile.id, ...input },
    select: portfolioItemSelect,
  });
  await audit({ userId, action: 'talent_portfolio_created', meta: { profileId: profile.id, itemId: item.id } });
  return serializePortfolioItem(item);
}

export async function updatePortfolioItem(
  userId: string,
  itemId: string,
  input: UpdatePortfolioItemInput,
) {
  const ownedItem = await db.portfolioItem.findFirst({
    where: { id: itemId, profile: { userId } },
    select: { id: true, profileId: true },
  });
  if (!ownedItem) throw new ServiceError('Portfolio item was not found.', 404);

  const item = await db.portfolioItem.update({
    where: { id: ownedItem.id },
    data: input,
    select: portfolioItemSelect,
  });
  await audit({ userId, action: 'talent_portfolio_updated', meta: { profileId: ownedItem.profileId, itemId } });
  return serializePortfolioItem(item);
}

export async function deletePortfolioItem(userId: string, itemId: string): Promise<void> {
  const result = await db.portfolioItem.deleteMany({
    where: { id: itemId, profile: { userId } },
  });
  if (result.count === 0) throw new ServiceError('Portfolio item was not found.', 404);
  await audit({ userId, action: 'talent_portfolio_deleted', meta: { itemId } });
}
