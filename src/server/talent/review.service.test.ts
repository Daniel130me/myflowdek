import assert from 'node:assert/strict';
import test from 'node:test';

import { db } from '@/server/db/client';
import { createClientReviewSchema, createProfessionalReviewSchema } from './review.schemas';
import { reviewService } from './review.service';

test('createProfessionalReviewSchema validates rating bounds (1 to 5)', () => {
  assert.equal(
    createProfessionalReviewSchema.safeParse({
      qualityRating: 6,
      communicationRating: 5,
      competenceRating: 5,
      timelinessRating: 5,
      wouldHireAgain: true,
    }).success,
    false
  );

  assert.equal(
    createProfessionalReviewSchema.safeParse({
      qualityRating: 5,
      communicationRating: 4,
      competenceRating: 5,
      timelinessRating: 5,
      wouldHireAgain: true,
      writtenFeedback: 'Exceptional work delivered ahead of milestone deadline.',
    }).success,
    true
  );
});

test('createClientReviewSchema validates ratings and optional feedback', () => {
  assert.equal(
    createClientReviewSchema.safeParse({
      clarityRating: 0,
      communicationRating: 5,
      professionalismRating: 5,
      paymentRating: 5,
      wouldWorkAgain: true,
    }).success,
    false
  );

  assert.equal(
    createClientReviewSchema.safeParse({
      clarityRating: 5,
      communicationRating: 5,
      professionalismRating: 5,
      paymentRating: 5,
      wouldWorkAgain: true,
      writtenFeedback: 'Great client with clear requirements and prompt payment release.',
    }).success,
    true
  );

  assert.equal(
    createClientReviewSchema.safeParse({
      clarityRating: 5,
      communicationRating: 5,
      professionalismRating: 5,
      wouldWorkAgain: true,
    }).success,
    true,
  );
});

test('client payment ratings require verified payment activity and private review history stays owner-only', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const client = await db.user.create({ data: { email: `review-client-${runId}@example.com`, name: 'Review Client' } });
  const professional = await db.user.create({ data: { email: `review-pro-${runId}@example.com`, name: 'Review Professional' } });
  const outsider = await db.user.create({ data: { email: `review-outsider-${runId}@example.com`, name: 'Review Outsider' } });
  const profile = await db.professionalProfile.create({
    data: {
      userId: professional.id,
      slug: `review-pro-${runId}`,
      professionalTitle: 'Review Professional',
      status: 'DRAFT',
      visibility: 'PRIVATE',
    },
  });
  const workspace = await db.workspace.create({
    data: {
      name: 'Review Privacy Test',
      slug: `review-privacy-${runId}`,
      members: { create: { userId: client.id, role: 'OWNER' } },
    },
  });
  const project = await db.project.create({
    data: {
      name: 'Review Privacy Project',
      ownerId: client.id,
      workspaceId: workspace.id,
      members: { create: { userId: client.id, role: 'OWNER' } },
    },
  });
  const task = await db.task.create({ data: { projectId: project.id, name: 'Review task', createdById: client.id } });
  const engagement = await db.engagement.create({
    data: {
      taskId: task.id,
      professionalProfileId: profile.id,
      clientUserId: client.id,
      status: 'COMPLETED',
      title: 'Completed review contract',
      scopeDescription: 'Completed contract used to verify review privacy rules.',
      agreedPrice: 50_000,
      currency: 'NGN',
      completedAt: new Date(),
    },
  });

  const baseReview = {
    clarityRating: 5,
    communicationRating: 5,
    professionalismRating: 5,
    wouldWorkAgain: true,
  };

  try {
    await assert.rejects(
      () => reviewService.submitClientReview(professional.id, engagement.id, { ...baseReview, paymentRating: 5 }),
      /only when a Flowdek payment occurred/i,
    );
    const review = await reviewService.submitClientReview(professional.id, engagement.id, baseReview);
    assert.equal(review.paymentRating, null);

    await assert.rejects(
      () => reviewService.getProfileReviewsAndMetrics(outsider.id, profile.id),
      /not found/i,
    );
    const ownerView = await reviewService.getProfileReviewsAndMetrics(professional.id, profile.id);
    assert.ok(ownerView.metrics);

    await db.professionalProfile.update({
      where: { id: profile.id },
      data: { status: 'PUBLISHED', visibility: 'FLOWDEK_USERS' },
    });
    const publicView = await reviewService.getProfileReviewsAndMetrics(outsider.id, profile.id);
    assert.ok(publicView.metrics);
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [client.id, professional.id, outsider.id] } } });
  }
});
