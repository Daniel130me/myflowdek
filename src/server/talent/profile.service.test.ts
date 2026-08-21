import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PrismaClient } from '@prisma/client';

import { ServiceError } from '@/server/http/errors';
import { portfolioItemSchema, updateProfessionalProfileSchema } from './profile.schemas';
import {
  createPortfolioItem,
  createProfessionalProfile,
  deletePortfolioItem,
  getOwnProfessionalProfile,
  publishOwnProfessionalProfile,
  unpublishOwnProfessionalProfile,
  updateOwnProfessionalProfile,
  updatePortfolioItem,
} from './profile.service';
import { seedTalentTaxonomy } from './taxonomy-seed.service';

const prisma = new PrismaClient();
const runId = Date.now().toString(36);
const ownerEmail = `test-${runId}-talent-owner@flowdek.io`;
const otherEmail = `test-${runId}-talent-other@flowdek.io`;

let ownerId: string;
let otherUserId: string;
let roleId: string;
let skillId: string;

async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: [ownerEmail, otherEmail] } },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  if (userIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

before(async () => {
  await cleanup();
  await seedTalentTaxonomy();

  const [owner, other, role, skill] = await Promise.all([
    prisma.user.create({ data: { email: ownerEmail, name: 'Talent Owner', passwordHash: 'hash' } }),
    prisma.user.create({ data: { email: otherEmail, name: 'Other Professional', passwordHash: 'hash' } }),
    prisma.professionalRole.findFirstOrThrow({ where: { isActive: true } }),
    prisma.skill.findFirstOrThrow({ where: { isActive: true } }),
  ]);

  ownerId = owner.id;
  otherUserId = other.id;
  roleId = role.id;
  skillId = skill.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('professional profile lifecycle', () => {
  test('profile creation is explicit, private, and unique per user', async () => {
    assert.equal(await getOwnProfessionalProfile(ownerId), null);

    const profile = await createProfessionalProfile({ id: ownerId, name: 'Talent Owner' });
    assert.equal(profile.status, 'DRAFT');
    assert.equal(profile.visibility, 'PRIVATE');

    await assert.rejects(
      createProfessionalProfile({ id: ownerId, name: 'Talent Owner' }),
      (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002',
    );
  });

  test('draft updates use shared taxonomy and publish only when complete', async () => {
    await assert.rejects(
      publishOwnProfessionalProfile(ownerId),
      (error: unknown) => error instanceof ServiceError && error.status === 400,
    );

    const bio = 'I help delivery teams turn complex requirements into dependable, maintainable products with clear communication and careful execution.';
    const profile = await updateOwnProfessionalProfile(ownerId, {
      professionalTitle: 'Senior Product Engineer',
      bio,
      yearsOfExperience: 8,
      location: 'Lagos, Nigeria',
      timezone: 'Africa/Lagos',
      remotePreference: 'FLEXIBLE',
      rateType: 'HOURLY',
      minimumRate: 50,
      maximumRate: 90,
      currency: 'USD',
      roleIds: [roleId],
      skills: [{ skillId, proficiency: 'EXPERT' }],
      availability: {
        status: 'AVAILABLE_NOW',
        weeklyAvailableHours: 30,
        availableFrom: null,
      },
    });

    assert.equal(profile.roles.length, 1);
    assert.equal(profile.skills[0]?.isVerified, false);

    const published = await publishOwnProfessionalProfile(ownerId);
    assert.equal(published.status, 'PUBLISHED');
    assert.equal(published.visibility, 'FLOWDEK_USERS');
    assert.equal('email' in published, false);
    assert.equal('userId' in published, false);

    const unpublished = await unpublishOwnProfessionalProfile(ownerId);
    assert.equal(unpublished.status, 'DRAFT');
    assert.equal(unpublished.visibility, 'PRIVATE');
  });

  test('portfolio mutations are owner-scoped', async () => {
    const item = await createPortfolioItem(ownerId, {
      title: 'Delivery platform',
      description: 'A representative project.',
      url: 'https://example.com/work/delivery-platform',
      sortOrder: 0,
    });

    await assert.rejects(
      updatePortfolioItem(otherUserId, item.id, { title: 'Hijacked' }),
      (error: unknown) => error instanceof ServiceError && error.status === 404,
    );
    await assert.rejects(
      deletePortfolioItem(otherUserId, item.id),
      (error: unknown) => error instanceof ServiceError && error.status === 404,
    );

    await deletePortfolioItem(ownerId, item.id);
  });
});

describe('professional profile validation', () => {
  test('rejects duplicate skills and inverted rates', () => {
    const result = updateProfessionalProfileSchema.safeParse({
      minimumRate: 100,
      maximumRate: 50,
      skills: [
        { skillId: 'skill-1', proficiency: 'ADVANCED' },
        { skillId: 'skill-1', proficiency: 'EXPERT' },
      ],
    });
    assert.equal(result.success, false);
  });

  test('accepts only web portfolio links', () => {
    assert.equal(portfolioItemSchema.safeParse({ title: 'Unsafe', url: 'javascript:alert(1)' }).success, false);
    assert.equal(portfolioItemSchema.safeParse({ title: 'Safe', url: 'https://example.com' }).success, true);
  });
});
