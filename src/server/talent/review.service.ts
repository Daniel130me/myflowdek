import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import { CreateClientReviewInput, CreateProfessionalReviewInput } from './review.schemas';

export class ReviewService {
  /**
   * Submits a review written by the client for the professional contractor
   */
  async submitProfessionalReview(
    clientUserId: string,
    engagementId: string,
    input: CreateProfessionalReviewInput
  ) {
    const engagement = await db.engagement.findUnique({
      where: { id: engagementId },
      include: {
        professionalProfile: { select: { id: true, userId: true } },
      },
    });

    if (!engagement) {
      throw new ServiceError('Engagement contract not found', 404);
    }

    if (engagement.clientUserId !== clientUserId) {
      throw new ServiceError('Only the contract client/manager can submit a review for the contractor', 403);
    }

    if (engagement.status !== 'COMPLETED') {
      throw new ServiceError('Reviews can only be submitted for completed engagements', 400);
    }
    const existingReview = await db.professionalReview.findUnique({
      where: { engagementId },
    });

    if (existingReview) {
      throw new ServiceError('A review has already been submitted for this engagement', 400);
    }

    const review = await db.$transaction(async (tx) => {
      const createdReview = await tx.professionalReview.create({
        data: {
          engagementId,
          professionalProfileId: engagement.professionalProfileId,
          clientUserId,
          qualityRating: input.qualityRating,
          communicationRating: input.communicationRating,
          competenceRating: input.competenceRating,
          timelinessRating: input.timelinessRating,
          wouldHireAgain: input.wouldHireAgain,
          writtenFeedback: input.writtenFeedback || null,
        },
      });

      await tx.engagementActivity.create({
        data: {
          engagementId,
          authorId: clientUserId,
          type: 'REVIEW_SUBMITTED',
          description: `Client submitted a verified engagement review and rating for contractor.`,
        },
      });

      return createdReview;
    });

    // Recalculate verified professional metrics
    await this.recalculateProfessionalMetrics(engagement.professionalProfileId);

    return review;
  }

  /**
   * Submits a review written by the professional contractor for the client
   */
  async submitClientReview(
    proUserId: string,
    engagementId: string,
    input: CreateClientReviewInput
  ) {
    const engagement = await db.engagement.findUnique({
      where: { id: engagementId },
      include: {
        professionalProfile: { select: { id: true, userId: true } },
        payments: {
          where: { state: { in: ['FUNDED', 'RELEASE_PENDING', 'RELEASED', 'REFUND_PENDING', 'REFUNDED'] } },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!engagement) {
      throw new ServiceError('Engagement contract not found', 404);
    }

    if (engagement.professionalProfile.userId !== proUserId) {
      throw new ServiceError('Only the assigned professional contractor can submit a review for the client', 403);
    }

    if (engagement.status !== 'COMPLETED') {
      throw new ServiceError('Reviews can only be submitted for completed engagements', 400);
    }
    if (input.paymentRating != null && engagement.payments.length === 0) {
      throw new ServiceError('Payment reliability can be rated only when a Flowdek payment occurred.', 400);
    }

    const existingReview = await db.clientReview.findUnique({
      where: { engagementId },
    });

    if (existingReview) {
      throw new ServiceError('A review for this client has already been submitted', 400);
    }

    const review = await db.$transaction(async (tx) => {
      const createdReview = await tx.clientReview.create({
        data: {
          engagementId,
          clientUserId: engagement.clientUserId,
          professionalProfileId: engagement.professionalProfileId,
          clarityRating: input.clarityRating,
          communicationRating: input.communicationRating,
          professionalismRating: input.professionalismRating,
          paymentRating: input.paymentRating ?? null,
          wouldWorkAgain: input.wouldWorkAgain,
          writtenFeedback: input.writtenFeedback || null,
        },
      });

      await tx.engagementActivity.create({
        data: {
          engagementId,
          authorId: proUserId,
          type: 'CLIENT_REVIEW_SUBMITTED',
          description: `Contractor submitted feedback and rating for the client.`,
        },
      });

      return createdReview;
    });

    return review;
  }

  /**
   * Recalculates verified Flowdek metrics for a professional profile
   */
  async recalculateProfessionalMetrics(professionalProfileId: string) {
    const completedEngagements = await db.engagement.findMany({
      where: { professionalProfileId, status: 'COMPLETED' },
      select: { id: true, clientUserId: true, deadline: true, completedAt: true },
    });

    const totalTrackedEngagements = await db.engagement.count({
      where: {
        professionalProfileId,
        status: { in: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
      },
    });

    const reviews = await db.professionalReview.findMany({
      where: { professionalProfileId },
    });

    const completedCount = completedEngagements.length;
    const completionRate =
      totalTrackedEngagements > 0
        ? Math.min(100.0, Math.round((completedCount / totalTrackedEngagements) * 1000) / 10)
        : 100.0;

    let onTimeCount = 0;
    let deadlineTrackedCount = 0;

    completedEngagements.forEach((eng) => {
      if (eng.deadline && eng.completedAt) {
        deadlineTrackedCount++;
        if (new Date(eng.completedAt) <= new Date(eng.deadline)) {
          onTimeCount++;
        }
      }
    });

    const onTimeRate =
      deadlineTrackedCount > 0
        ? Math.round((onTimeCount / deadlineTrackedCount) * 1000) / 10
        : 100.0;

    // Aggregate rating average across reviews
    let totalOverallRatingSum = 0;
    reviews.forEach((r) => {
      const itemAvg = (r.qualityRating + r.communicationRating + r.competenceRating + r.timelinessRating) / 4;
      totalOverallRatingSum += itemAvg;
    });

    const averageRating =
      reviews.length > 0 ? Math.round((totalOverallRatingSum / reviews.length) * 10) / 10 : 0.0;

    // Calculate repeat hires (clients with > 1 completed engagement)
    const clientCounts: Record<string, number> = {};
    completedEngagements.forEach((e) => {
      clientCounts[e.clientUserId] = (clientCounts[e.clientUserId] || 0) + 1;
    });

    let repeatHireCount = 0;
    Object.values(clientCounts).forEach((c) => {
      if (c > 1) repeatHireCount++;
    });

    const metrics = await db.professionalMetrics.upsert({
      where: { professionalProfileId },
      create: {
        professionalProfileId,
        completedEngagements: completedCount,
        completionRate,
        onTimeRate,
        averageRating,
        repeatHireCount,
        totalReviews: reviews.length,
      },
      update: {
        completedEngagements: completedCount,
        completionRate,
        onTimeRate,
        averageRating,
        repeatHireCount,
        totalReviews: reviews.length,
      },
    });

    return metrics;
  }

  /**
   * Retrieves both reviews associated with an engagement contract
   */
  async getEngagementReviews(userId: string, engagementId: string) {
    const engagement = await db.engagement.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        clientUserId: true,
        professionalProfile: { select: { userId: true } },
      },
    });

    if (!engagement) {
      throw new ServiceError('Engagement not found', 404);
    }

    if (
      engagement.clientUserId !== userId &&
      engagement.professionalProfile.userId !== userId
    ) {
      throw new ServiceError('Unauthorized to view engagement reviews', 403);
    }

    const [professionalReview, clientReview] = await Promise.all([
      db.professionalReview.findUnique({
        where: { engagementId },
        include: {
          clientUser: { select: { id: true, name: true, avatarUrl: true, avatarColor: true } },
        },
      }),
      db.clientReview.findUnique({
        where: { engagementId },
        include: {
          professionalProfile: {
            include: { user: { select: { id: true, name: true, avatarUrl: true, avatarColor: true } } },
          },
        },
      }),
    ]);

    return { professionalReview, clientReview };
  }

  /**
   * Retrieves verified client reviews and calculated trust metrics for a professional profile
   */
  async getProfileReviewsAndMetrics(viewerUserId: string, professionalProfileId: string) {
    const profile = await db.professionalProfile.findUnique({
      where: { id: professionalProfileId },
      select: { id: true, userId: true, status: true, visibility: true },
    });

    if (!profile) {
      throw new ServiceError('Professional profile not found', 404);
    }
    const isOwner = profile.userId === viewerUserId;
    const isVisible = profile.status === 'PUBLISHED' && profile.visibility === 'FLOWDEK_USERS';
    if (!isOwner && !isVisible) {
      throw new ServiceError('Professional profile not found', 404);
    }

    const metrics = await this.recalculateProfessionalMetrics(professionalProfileId);

    const reviews = await db.professionalReview.findMany({
      where: { professionalProfileId },
      include: {
        clientUser: { select: { id: true, name: true, avatarUrl: true, avatarColor: true } },
        engagement: { select: { id: true, title: true, completedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { metrics, reviews };
  }
}

export const reviewService = new ReviewService();
