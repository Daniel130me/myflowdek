import { z } from 'zod';

import { AVAILABILITY_STATUSES, RATE_TYPES, REMOTE_PREFERENCES } from './profile.schemas';

export const PROFESSIONAL_DIRECTORY_SORTS = [
  'RELEVANCE',
  'NEWEST',
  'RATE_LOW_TO_HIGH',
  'RATE_HIGH_TO_LOW',
] as const;

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

const optionalNumber = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.coerce.number().min(0).max(9999999999.99).optional(),
);

export const professionalDirectoryQuerySchema = z.object({
  search: optionalText(100),
  roleId: optionalText(80),
  skillIds: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  availability: z.enum(AVAILABILITY_STATUSES).optional(),
  location: optionalText(120),
  timezone: optionalText(100),
  remotePreference: z.enum(REMOTE_PREFERENCES).optional(),
  rateType: z.enum(RATE_TYPES).optional(),
  minimumRate: optionalNumber,
  maximumRate: optionalNumber,
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(PROFESSIONAL_DIRECTORY_SORTS).default('RELEVANCE'),
}).strict().superRefine((value, context) => {
  if (value.minimumRate != null && value.maximumRate != null && value.minimumRate > value.maximumRate) {
    context.addIssue({
      code: 'custom',
      path: ['maximumRate'],
      message: 'Maximum rate must be greater than or equal to minimum rate.',
    });
  }
});

export function readProfessionalDirectoryQuery(searchParams: URLSearchParams) {
  const skillIds = searchParams
    .getAll('skillIds')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return professionalDirectoryQuerySchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    roleId: searchParams.get('roleId') ?? undefined,
    skillIds,
    availability: searchParams.get('availability') ?? undefined,
    location: searchParams.get('location') ?? undefined,
    timezone: searchParams.get('timezone') ?? undefined,
    remotePreference: searchParams.get('remotePreference') ?? undefined,
    rateType: searchParams.get('rateType') ?? undefined,
    minimumRate: searchParams.get('minimumRate') ?? undefined,
    maximumRate: searchParams.get('maximumRate') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
  });
}

export type ProfessionalDirectoryQuery = z.infer<typeof professionalDirectoryQuerySchema>;
export type ProfessionalDirectorySort = z.infer<typeof professionalDirectoryQuerySchema>['sort'];
