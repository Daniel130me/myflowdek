import { Prisma } from '@prisma/client';

import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import type { ProfessionalDirectoryQuery, ProfessionalDirectorySort } from './directory.schemas';
import { publicProfessionalProfileSelect, toPublicProfessionalProfileDto } from './directory.select';

function buildPublishedProfileWhere(query: ProfessionalDirectoryQuery): Prisma.ProfessionalProfileWhereInput {
  const filters: Prisma.ProfessionalProfileWhereInput[] = [
    { status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' },
  ];

  if (query.search) {
    const contains = query.search;
    filters.push({
      OR: [
        { professionalTitle: { contains, mode: 'insensitive' } },
        { bio: { contains, mode: 'insensitive' } },
        { user: { name: { contains, mode: 'insensitive' } } },
        { roles: { some: { role: { name: { contains, mode: 'insensitive' } } } } },
        { skills: { some: { skill: { name: { contains, mode: 'insensitive' } } } } },
      ],
    });
  }

  if (query.roleId) filters.push({ roles: { some: { roleId: query.roleId } } });
  for (const skillId of query.skillIds) {
    filters.push({ skills: { some: { skillId } } });
  }
  if (query.availability) filters.push({ availability: { status: query.availability } });
  if (query.location) filters.push({ location: { contains: query.location, mode: 'insensitive' } });
  if (query.timezone) filters.push({ timezone: { contains: query.timezone, mode: 'insensitive' } });
  if (query.remotePreference) filters.push({ remotePreference: query.remotePreference });
  if (query.rateType) filters.push({ rateType: query.rateType });
  if (query.minimumRate != null) {
    const minimumRate = new Prisma.Decimal(query.minimumRate);
    filters.push({
      OR: [
        { maximumRate: { gte: minimumRate } },
        { maximumRate: null, minimumRate: { gte: minimumRate } },
      ],
    });
  }
  if (query.maximumRate != null) {
    const maximumRate = new Prisma.Decimal(query.maximumRate);
    filters.push({
      OR: [
        { minimumRate: { lte: maximumRate } },
        { minimumRate: null, maximumRate: { lte: maximumRate } },
      ],
    });
  }

  return { AND: filters };
}

function buildOrderBy(sort: ProfessionalDirectorySort): Prisma.ProfessionalProfileOrderByWithRelationInput[] {
  switch (sort) {
    case 'RATE_LOW_TO_HIGH':
      return [{ minimumRate: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }, { id: 'asc' }];
    case 'RATE_HIGH_TO_LOW':
      return [{ maximumRate: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }, { id: 'asc' }];
    case 'NEWEST':
    case 'RELEVANCE':
    default:
      return [{ updatedAt: 'desc' }, { id: 'asc' }];
  }
}

export async function listPublishedProfessionals(query: ProfessionalDirectoryQuery) {
  const where = buildPublishedProfileWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [profiles, total] = await Promise.all([
    db.professionalProfile.findMany({
      where,
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.limit,
      select: publicProfessionalProfileSelect,
    }),
    db.professionalProfile.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    profiles: profiles.map(toPublicProfessionalProfileDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasPrevious: query.page > 1,
      hasNext: query.page < totalPages,
    },
  };
}

export async function getPublishedProfessionalBySlug(slug: string) {
  const profile = await db.professionalProfile.findFirst({
    where: { slug, status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' },
    select: publicProfessionalProfileSelect,
  });
  return profile ? toPublicProfessionalProfileDto(profile) : null;
}

export async function requirePublishedProfessionalBySlug(slug: string) {
  const profile = await getPublishedProfessionalBySlug(slug);
  if (!profile) throw new ServiceError('Professional profile was not found.', 404);
  return profile;
}
