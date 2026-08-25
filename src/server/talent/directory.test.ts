import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';

import { readProfessionalDirectoryQuery } from './directory.schemas';
import { toPublicProfessionalProfileDto, type PublicProfessionalProfileRecord } from './directory.select';

test('directory query accepts combined filters and normalizes comma-separated skills', () => {
  const parsed = readProfessionalDirectoryQuery(new URLSearchParams({
    search: 'backend',
    roleId: 'role-1',
    skillIds: 'skill-1,skill-2',
    availability: 'AVAILABLE_NOW',
    location: 'Lagos',
    timezone: 'Africa/Lagos',
    remotePreference: 'REMOTE_ONLY',
    rateType: 'HOURLY',
    minimumRate: '25',
    maximumRate: '80',
    page: '2',
    limit: '12',
    sort: 'RATE_LOW_TO_HIGH',
  }));

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.deepEqual(parsed.data.skillIds, ['skill-1', 'skill-2']);
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.minimumRate, 25);
});

test('directory query rejects inverted rate ranges', () => {
  const parsed = readProfessionalDirectoryQuery(new URLSearchParams({ minimumRate: '100', maximumRate: '50' }));
  assert.equal(parsed.success, false);
});

test('public profile DTO excludes private account identifiers and contact details', () => {
  const now = new Date('2026-08-21T08:00:00.000Z');
  const record = {
    id: 'profile-1',
    slug: 'ada-lovelace',
    professionalTitle: 'Backend Engineer',
    bio: 'Builds reliable systems.',
    yearsOfExperience: 8,
    location: 'Lagos',
    timezone: 'Africa/Lagos',
    remotePreference: 'REMOTE_ONLY',
    rateType: 'HOURLY',
    minimumRate: new Prisma.Decimal(50),
    maximumRate: new Prisma.Decimal(90),
    currency: 'USD',
    createdAt: now,
    updatedAt: now,
    user: { name: 'Ada Lovelace', avatarColor: '#FE8029' },
    availability: { status: 'AVAILABLE_NOW', weeklyAvailableHours: 30, availableFrom: now },
    roles: [],
    skills: [],
    portfolioItems: [],
  } as PublicProfessionalProfileRecord;

  const dto = toPublicProfessionalProfileDto(record);
  assert.equal(dto.displayName, 'Ada Lovelace');
  assert.equal(dto.minimumRate, '50');
  assert.equal('userId' in dto, false);
  assert.equal('email' in dto, false);
  assert.equal('user' in dto, false);
});
