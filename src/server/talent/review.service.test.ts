import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientReviewSchema, createProfessionalReviewSchema } from './review.schemas';

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
});
