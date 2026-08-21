import { Prisma } from '@prisma/client';
import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import { defaultPaymentProvider, MarketplacePaymentProvider } from './payment.provider';
import { ConnectPaymentAccountInput, InitializePaymentInput, RequestRefundInput } from './payment.schemas';

const getPlatformFeePercentage = (): number => {
  const envVal = process.env.PLATFORM_FEE_PERCENTAGE;
  if (!envVal) return 10.0;
  const parsed = parseFloat(envVal);
  return isNaN(parsed) ? 10.0 : parsed;
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
        opportunity: { select: { createdById: true } },
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

    // Verify milestone if provided
    let targetMilestone = null;
    if (input.milestoneId) {
      targetMilestone = engagement.milestones.find((m) => m.id === input.milestoneId);
      if (!targetMilestone) {
        throw new ServiceError('Milestone not found for this engagement', 404);
      }
    }

    const feePercent = getPlatformFeePercentage();
    const grossAmount = input.amount;
    const platformFee = Math.round((grossAmount * (feePercent / 100)) * 100) / 100;
    const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;

    const user = await db.user.findUnique({
      where: { id: clientUserId },
      select: { email: true, name: true },
    });

    // Initialize checkout with provider
    const checkout = await this.provider.initializeCheckout({
      engagementId,
      milestoneId: input.milestoneId,
      amount: grossAmount,
      currency: input.currency,
      clientEmail: user?.email || 'client@flowdek.app',
      clientName: user?.name || undefined,
    });

    // Save EngagementPayment record
    const payment = await db.$transaction(async (tx) => {
      const createdPayment = await tx.engagementPayment.create({
        data: {
          engagementId,
          milestoneId: input.milestoneId || null,
          amount: new Prisma.Decimal(grossAmount),
          platformFee: new Prisma.Decimal(platformFee),
          netAmount: new Prisma.Decimal(netAmount),
          currency: input.currency,
          state: 'FUNDING_PENDING',
          provider: 'PAYSTACK',
          providerReference: checkout.transactionReference,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: createdPayment.id,
          type: 'FUNDING',
          amount: new Prisma.Decimal(grossAmount),
          currency: input.currency,
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
        grossAmount,
        platformFee,
        feePercentage: feePercent,
        netContractorPayout: netAmount,
      },
    };
  }

  /**
   * Cryptographically verifies and processes incoming payment webhooks
   */
  async handleWebhookEvent(rawBody: string, signatureHeader: string, eventPayload: any) {
    const isValid = this.provider.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      throw new ServiceError('Invalid webhook signature', 401);
    }

    const providerEventId = eventPayload.id || eventPayload.data?.reference || `EVT_${Date.now()}`;
    const eventType = eventPayload.event || 'charge.success';

    // Check duplicate idempotent processing
    const existingEvent = await db.paymentWebhookEvent.findUnique({
      where: { providerEventId },
    });

    if (existingEvent) {
      return { status: 'already_processed' };
    }

    await db.$transaction(async (tx) => {
      // Record webhook event
      await tx.paymentWebhookEvent.create({
        data: {
          provider: 'PAYSTACK',
          providerEventId,
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
        await tx.engagementPayment.update({
          where: { id: payment.id },
          data: {
            state: 'FUNDED',
            fundedAt: new Date(),
          },
        });

        await tx.paymentTransaction.create({
          data: {
            engagementPaymentId: payment.id,
            type: 'FUNDING',
            amount: payment.amount,
            currency: payment.currency,
            status: 'SUCCESS',
            providerReference: reference,
            rawPayload: eventPayload,
          },
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
      const updatedPayment = await tx.engagementPayment.update({
        where: { id: paymentId },
        data: {
          state: 'FUNDED',
          fundedAt: new Date(),
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: paymentId,
          type: 'FUNDING',
          amount: payment.amount,
          currency: payment.currency,
          status: 'SUCCESS',
          providerReference: payment.providerReference,
        },
      });

      await tx.engagementActivity.create({
        data: {
          engagementId: payment.engagementId,
          authorId: clientUserId,
          type: 'PAYMENT_FUNDED',
          description: `Milestone funded in protected holding (${payment.currency} ${payment.amount}).`,
        },
      });

      return updatedPayment;
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
              include: { paymentAccounts: true },
            },
          },
        },
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

    const professionalAccount = payment.engagement.professionalProfile.paymentAccounts[0];
    const recipientCode = professionalAccount?.accountCode || 'RCP_SANDBOX';

    // Execute provider transfer
    const payoutResult = await this.provider.releasePayout({
      engagementPaymentId: paymentId,
      recipientAccountCode: recipientCode,
      amount: Number(payment.netAmount),
      currency: payment.currency,
      reason: `Payout for engagement milestone on Flowdek`,
    });

    return db.$transaction(async (tx) => {
      const releasedPayment = await tx.engagementPayment.update({
        where: { id: paymentId },
        data: {
          state: 'RELEASED',
          releasedAt: new Date(),
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: paymentId,
          type: 'RELEASE',
          amount: payment.netAmount,
          currency: payment.currency,
          status: 'SUCCESS',
          providerReference: payoutResult.transferReference,
        },
      });

      await tx.professionalPayout.create({
        data: {
          professionalProfileId: payment.engagement.professionalProfileId,
          engagementPaymentId: paymentId,
          amount: payment.netAmount,
          currency: payment.currency,
          status: 'SUCCESS',
          providerReference: payoutResult.transferReference,
          transferredAt: new Date(),
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

    return db.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          engagementPaymentId: input.paymentId,
          requestedById: userId,
          amount: payment.amount,
          reason: input.reason,
          status: 'APPROVED',
          processedAt: new Date(),
        },
      });

      await tx.engagementPayment.update({
        where: { id: input.paymentId },
        data: {
          state: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      await tx.paymentTransaction.create({
        data: {
          engagementPaymentId: input.paymentId,
          type: 'REFUND',
          amount: payment.amount,
          currency: payment.currency,
          status: 'SUCCESS',
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

    payments.forEach((p: any) => {
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
      },
    };
  }
}

export const paymentService = new PaymentService();
