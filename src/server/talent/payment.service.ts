import { Prisma } from '@prisma/client';
import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import { defaultPaymentProvider, isPaymentSandboxEnabled, MarketplacePaymentProvider } from './payment.provider';
import { ConnectPaymentAccountInput, InitializePaymentInput, RequestRefundInput } from './payment.schemas';

const getPlatformFeePercentage = (): number => {
  const envVal = process.env.PLATFORM_FEE_PERCENTAGE;
  if (!envVal) return 10.0;
  const parsed = parseFloat(envVal);
  return Number.isFinite(parsed) && parsed >= 0 && parsed < 100 ? parsed : 10.0;
};

type PaymentWebhookPayload = {
  id?: string | number;
  event?: string;
  data?: {
    id?: string | number;
    reference?: string;
    amount?: number;
    currency?: string;
  };
};

export class PaymentService {
  constructor(private provider: MarketplacePaymentProvider = defaultPaymentProvider) {}

  /**
   * Connects / saves a professional contractor's payout bank account
   */
  async saveProfessionalPaymentAccount(userId: string, input: ConnectPaymentAccountInput) {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true, bio: true, user: { select: { name: true } } },
    });

    if (!profile) {
      throw new ServiceError('Professional profile not found. Please create a profile first.', 404);
    }

    const businessName = profile.user.name || 'Professional Contractor';

    // Register with provider
    const createdAccount = await this.provider.createProfessionalAccount({
      userId,
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      bankName: input.bankName,
      businessName,
    });

    // Save in database
    const paymentAccount = await db.professionalPaymentAccount.upsert({
      where: { accountCode: createdAccount.accountCode },
      create: {
        professionalProfileId: profile.id,
        provider: input.provider,
        accountCode: createdAccount.accountCode,
        accountNumberMasked: createdAccount.accountNumberMasked,
        bankName: input.bankName,
        bankCode: input.bankCode,
        currency: input.currency,
        isVerified: true,
      },
      update: {
        accountNumberMasked: createdAccount.accountNumberMasked,
        bankName: input.bankName,
        bankCode: input.bankCode,
        currency: input.currency,
        isVerified: true,
      },
    });

    return paymentAccount;
  }

  /**
   * Retrieves professional's payout bank account
   */
  async getProfessionalPaymentAccount(userId: string) {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) return null;

    return db.professionalPaymentAccount.findFirst({
      where: { professionalProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Client initializes milestone or total engagement funding
   */
  async initializeEngagementPayment(
    clientUserId: string,
    engagementId: string,
    input: InitializePaymentInput
  ) {
    const engagement = await db.engagement.findUnique({
      where: { id: engagementId },
      include: {
        milestones: true,
      },
    });

    if (!engagement) {
      throw new ServiceError('Engagement contract not found', 404);
    }

    // Verify manager / client authority
    if (engagement.clientUserId !== clientUserId) {
      throw new ServiceError('Only the client or contract manager can fund this engagement', 403);
    }
    if (engagement.status !== 'ACTIVE') {
      throw new ServiceError('Only an active engagement can be funded.', 409);
    }
    if (engagement.currency !== 'NGN' || input.currency !== engagement.currency) {
      throw new ServiceError('The initial payment launch supports NGN engagements only.', 400);
    }

    // Verify milestone if provided
    let targetMilestone = null;
    if (input.milestoneId) {
      targetMilestone = engagement.milestones.find((m) => m.id === input.milestoneId);
      if (!targetMilestone) {
        throw new ServiceError('Milestone not found for this engagement', 404);
      }
    }

    const trustedAmount = targetMilestone?.amount ?? engagement.agreedPrice;
    if (input.amount != null && !new Prisma.Decimal(input.amount).equals(trustedAmount)) {
      throw new ServiceError('The payment amount must match the server-calculated contract amount.', 400);
    }

    const existingPayment = await db.engagementPayment.findFirst({
      where: {
        engagementId,
        milestoneId: input.milestoneId ?? null,
        state: { notIn: ['FAILED', 'REFUNDED'] },
      },
      select: { id: true },
    });
    if (existingPayment) {
      throw new ServiceError('A payment already exists for this contract or milestone.', 409);
    }

    const feePercent = getPlatformFeePercentage();
    const grossAmount = trustedAmount;
    const platformFee = grossAmount.mul(feePercent).div(100).toDecimalPlaces(2);
    const netAmount = grossAmount.minus(platformFee);

    const user = await db.user.findUnique({
      where: { id: clientUserId },
      select: { email: true, name: true },
    });

    // Initialize checkout with provider
    let checkout;
    try {
      checkout = await this.provider.initializeCheckout({
        engagementId,
        milestoneId: input.milestoneId,
        amount: grossAmount.toNumber(),
        currency: engagement.currency,
        clientEmail: user?.email || 'client@flowdek.app',
        clientName: user?.name || undefined,
      });
    } catch {
      throw new ServiceError('The payment provider could not initialize checkout.', 502);
    }

    // Save EngagementPayment record
    const payment = await db.$transaction(async (tx) => {
      const createdPayment = await tx.engagementPayment.create({
        data: {
          engagementId,
          milestoneId: input.milestoneId || null,
          amount: grossAmount,
          platformFee,
          netAmount,
          currency: engagement.currency,
          state: 'FUNDING_PENDING',
          provider: 'PAYSTACK',
          providerReference: checkout.transactionReference,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: createdPayment.id,
          type: 'FUNDING',
          amount: grossAmount,
          currency: engagement.currency,
          status: 'PENDING',
          providerReference: checkout.transactionReference,
        },
      });

      return createdPayment;
    });

    return {
      payment,
      checkoutUrl: checkout.checkoutUrl,
      transactionReference: checkout.transactionReference,
      feeBreakdown: {
        grossAmount: grossAmount.toNumber(),
        platformFee: platformFee.toNumber(),
        feePercentage: feePercent,
        netContractorPayout: netAmount.toNumber(),
      },
    };
  }

  /**
   * Cryptographically verifies and processes incoming payment webhooks
   */
  async handleWebhookEvent(rawBody: string, signatureHeader: string, eventPayload: PaymentWebhookPayload) {
    const isValid = this.provider.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      throw new ServiceError('Invalid webhook signature', 401);
    }

    const providerEventId = eventPayload.id ?? eventPayload.data?.id;
    const eventType = eventPayload.event || 'charge.success';
    if (providerEventId == null) {
      throw new ServiceError('Payment webhook event ID is required.', 400);
    }

    // Check duplicate idempotent processing
    const existingEvent = await db.paymentWebhookEvent.findUnique({
      where: { providerEventId: String(providerEventId) },
    });

    if (existingEvent) {
      return { status: 'already_processed' };
    }

    await db.$transaction(async (tx) => {
      // Record webhook event
      await tx.paymentWebhookEvent.create({
        data: {
          provider: 'PAYSTACK',
          providerEventId: String(providerEventId),
          eventType,
          payload: eventPayload,
          processedAt: new Date(),
        },
      });

      const reference = eventPayload.data?.reference;
      if (!reference) return;

      const payment = await tx.engagementPayment.findUnique({
        where: { providerReference: reference },
        include: { engagement: true },
      });

      if (!payment) return;

      if (eventType === 'charge.success' || eventType === 'payment.funded') {
        if (eventPayload.data?.amount != null) {
          const reportedAmount = new Prisma.Decimal(eventPayload.data.amount).div(100);
          if (!reportedAmount.equals(payment.amount)) {
            throw new ServiceError('Webhook amount does not match the initialized payment.', 400);
          }
        }
        if (eventPayload.data?.currency && eventPayload.data.currency !== payment.currency) {
          throw new ServiceError('Webhook currency does not match the initialized payment.', 400);
        }

        const funded = await tx.engagementPayment.updateMany({
          where: { id: payment.id, state: 'FUNDING_PENDING' },
          data: {
            state: 'FUNDED',
            fundedAt: new Date(),
          },
        });
        if (funded.count === 0) return;

        await tx.paymentTransaction.updateMany({
          where: { engagementPaymentId: payment.id, type: 'FUNDING', status: 'PENDING' },
          data: { status: 'SUCCESS', rawPayload: eventPayload },
        });

        // Record Activity
        await tx.engagementActivity.create({
          data: {
            engagementId: payment.engagementId,
            authorId: payment.engagement.clientUserId,
            type: 'PAYMENT_FUNDED',
            description: `Contract milestone funded with ${payment.currency} ${payment.amount}. Funds held in provider protection.`,
          },
        });
      }
    });

    return { status: 'success' };
  }

  /**
   * Helper method for preview/sandbox mode to simulate funding completion instantly
   */
  async simulateSandboxFunding(clientUserId: string, paymentId: string) {
    if (!isPaymentSandboxEnabled()) {
      throw new ServiceError('Sandbox payment simulation is disabled.', 403);
    }
    const payment = await db.engagementPayment.findUnique({
      where: { id: paymentId },
      include: { engagement: true },
    });

    if (!payment) {
      throw new ServiceError('Payment record not found', 404);
    }

    if (payment.engagement.clientUserId !== clientUserId) {
      throw new ServiceError('Unauthorized', 403);
    }

    return db.$transaction(async (tx) => {
      const claimed = await tx.engagementPayment.updateMany({
        where: { id: paymentId, state: 'FUNDING_PENDING' },
        data: {
          state: 'FUNDED',
          fundedAt: new Date(),
        },
      });
      if (claimed.count === 0) throw new ServiceError('Only pending funding can be simulated.', 409);

      await tx.paymentTransaction.updateMany({
        where: { engagementPaymentId: paymentId, type: 'FUNDING', status: 'PENDING' },
        data: { status: 'SUCCESS' },
      });

      await tx.engagementActivity.create({
        data: {
          engagementId: payment.engagementId,
          authorId: clientUserId,
          type: 'PAYMENT_FUNDED',
          description: `Milestone funded in protected holding (${payment.currency} ${payment.amount}).`,
        },
      });

      return tx.engagementPayment.findUniqueOrThrow({ where: { id: paymentId } });
    });
  }

  /**
   * Client releases payout for a funded milestone upon approving work or completing engagement
   */
  async releaseMilestonePayment(clientUserId: string, paymentId: string) {
    const payment = await db.engagementPayment.findUnique({
      where: { id: paymentId },
      include: {
        engagement: {
          include: {
            professionalProfile: {
              include: { paymentAccounts: { where: { isVerified: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
            },
          },
        },
        milestone: { select: { status: true } },
      },
    });

    if (!payment) {
      throw new ServiceError('Payment record not found', 404);
    }

    if (payment.engagement.clientUserId !== clientUserId) {
      throw new ServiceError('Only the client can authorize payout release', 403);
    }

    if (payment.state !== 'FUNDED') {
      throw new ServiceError(`Cannot release payment in state '${payment.state}'. Must be FUNDED.`, 400);
    }
    if (payment.milestoneId && payment.milestone?.status !== 'APPROVED') {
      throw new ServiceError('Milestone payment can be released only after milestone approval.', 409);
    }

    const professionalAccount = payment.engagement.professionalProfile.paymentAccounts[0];
    if (!professionalAccount) {
      throw new ServiceError('The professional must connect a verified payout account before release.', 409);
    }

    const claimed = await db.engagementPayment.updateMany({
      where: { id: paymentId, state: 'FUNDED' },
      data: { state: 'RELEASE_PENDING' },
    });
    if (claimed.count === 0) {
      throw new ServiceError('This payment is already being released or is no longer funded.', 409);
    }

    // Execute provider transfer
    let payoutResult;
    try {
      payoutResult = await this.provider.releasePayout({
        engagementPaymentId: paymentId,
        recipientAccountCode: professionalAccount.accountCode,
        amount: Number(payment.netAmount),
        currency: payment.currency,
        reason: 'Payout for an approved Flowdek engagement milestone',
      });
    } catch {
      // Keep RELEASE_PENDING because a network failure can occur after the
      // provider accepted the transfer. Operations can reconcile by reference.
      throw new ServiceError('Payout status is pending provider reconciliation.', 502);
    }

    return db.$transaction(async (tx) => {
      const releasedPayment = await tx.engagementPayment.update({
        where: { id: paymentId },
        data: {
          state: payoutResult.status === 'SUCCESS' ? 'RELEASED' : 'RELEASE_PENDING',
          releasedAt: payoutResult.status === 'SUCCESS' ? new Date() : null,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: paymentId,
          type: 'RELEASE',
          amount: payment.netAmount,
          currency: payment.currency,
          status: payoutResult.status,
          providerReference: payoutResult.transferReference,
        },
      });

      await tx.professionalPayout.create({
        data: {
          professionalProfileId: payment.engagement.professionalProfileId,
          engagementPaymentId: paymentId,
          amount: payment.netAmount,
          currency: payment.currency,
          status: payoutResult.status,
          providerReference: payoutResult.transferReference,
          transferredAt: payoutResult.status === 'SUCCESS' ? new Date() : null,
        },
      });

      await tx.engagementActivity.create({
        data: {
          engagementId: payment.engagementId,
          authorId: clientUserId,
          type: 'PAYMENT_RELEASED',
          description: `Milestone payout of ${payment.currency} ${payment.netAmount} released to contractor account.`,
        },
      });

      return releasedPayment;
    });
  }

  /**
   * Request or process a refund for an engagement payment
   */
  async requestOrProcessRefund(userId: string, input: RequestRefundInput) {
    const payment = await db.engagementPayment.findUnique({
      where: { id: input.paymentId },
      include: { engagement: true },
    });

    if (!payment) {
      throw new ServiceError('Payment record not found', 404);
    }

    if (payment.engagement.clientUserId !== userId) {
      throw new ServiceError('Unauthorized to request refund', 403);
    }

    if (payment.state !== 'FUNDED' || !payment.providerReference) {
      throw new ServiceError('Only a funded, unreleased payment can be refunded.', 409);
    }

    const claimed = await db.engagementPayment.updateMany({
      where: { id: input.paymentId, state: 'FUNDED' },
      data: { state: 'REFUND_PENDING' },
    });
    if (claimed.count === 0) throw new ServiceError('This payment is already being processed.', 409);

    let providerRefund;
    try {
      providerRefund = await this.provider.processRefund({
        providerReference: payment.providerReference,
        amount: Number(payment.amount),
      });
    } catch {
      throw new ServiceError('Refund status is pending provider reconciliation.', 502);
    }

    return db.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          engagementPaymentId: input.paymentId,
          requestedById: userId,
          amount: payment.amount,
          reason: input.reason,
          status: providerRefund.status,
          processedAt: providerRefund.status === 'APPROVED' ? new Date() : null,
        },
      });

      await tx.engagementPayment.update({
        where: { id: input.paymentId },
        data: {
          state: providerRefund.status === 'APPROVED'
            ? 'REFUNDED'
            : providerRefund.status === 'REJECTED'
              ? 'FUNDED'
              : 'REFUND_PENDING',
          refundedAt: providerRefund.status === 'APPROVED' ? new Date() : null,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: input.paymentId,
          type: 'REFUND',
          amount: payment.amount,
          currency: payment.currency,
          status: providerRefund.status === 'APPROVED' ? 'SUCCESS' : 'PENDING',
          providerReference: providerRefund.refundReference,
        },
      });

      await tx.engagementActivity.create({
        data: {
          engagementId: payment.engagementId,
          authorId: userId,
          type: 'REFUND_PROCESSED',
          description: `Refund processed for payment: ${input.reason}`,
        },
      });

      return refund;
    });
  }

  /**
   * Retrieves payments list and financial overview for an engagement workspace
   */
  async getEngagementPayments(userId: string, engagementId: string) {
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
      throw new ServiceError('Unauthorized access to engagement payments', 403);
    }

    const payments = await db.engagementPayment.findMany({
      where: { engagementId },
      include: {
        milestone: true,
        transactions: true,
        payouts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalFunded = 0;
    let totalReleased = 0;
    let totalNetPayout = 0;

    payments.forEach((p) => {
      if (p.state === 'FUNDED' || p.state === 'RELEASED') {
        totalFunded += Number(p.amount);
      }
      if (p.state === 'RELEASED') {
        totalReleased += Number(p.amount);
        totalNetPayout += Number(p.netAmount);
      }
    });

    return {
      payments,
      summary: {
        totalFunded,
        totalReleased,
        totalNetPayout,
        currency: payments[0]?.currency || 'NGN',
        platformFeeRate: getPlatformFeePercentage(),
        sandboxEnabled: isPaymentSandboxEnabled(),
      },
    };
  }
}

export const paymentService = new PaymentService();
