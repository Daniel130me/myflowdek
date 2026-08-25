-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('DRAFT', 'AWAITING_PROFESSIONAL_ACCEPTANCE', 'ACTIVE', 'WORK_SUBMITTED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('UNFUNDED', 'FUNDING_PENDING', 'FUNDED', 'RELEASE_PENDING', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'FAILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "proposalId" TEXT,
    "professionalProfileId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "status" "EngagementStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "agreedPrice" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "disputeReason" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementMilestone" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementDeliverable" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "submittedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementActivity" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "authorId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalPaymentAccount" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "accountCode" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalPaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementPayment" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "state" "PaymentState" NOT NULL DEFAULT 'UNFUNDED',
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "providerReference" TEXT,
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "engagementPaymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" TEXT NOT NULL,
    "providerReference" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalPayout" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "engagementPaymentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "transferredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "engagementPaymentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalReview" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "qualityRating" INTEGER NOT NULL,
    "communicationRating" INTEGER NOT NULL,
    "competenceRating" INTEGER NOT NULL,
    "timelinessRating" INTEGER NOT NULL,
    "wouldHireAgain" BOOLEAN NOT NULL DEFAULT true,
    "writtenFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReview" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "clarityRating" INTEGER NOT NULL,
    "communicationRating" INTEGER NOT NULL,
    "professionalismRating" INTEGER NOT NULL,
    "paymentRating" INTEGER NOT NULL,
    "wouldWorkAgain" BOOLEAN NOT NULL DEFAULT true,
    "writtenFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalMetrics" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "completedEngagements" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "repeatHireCount" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Engagement_proposalId_key" ON "Engagement"("proposalId");

-- CreateIndex
CREATE INDEX "Engagement_taskId_status_idx" ON "Engagement"("taskId", "status");

-- CreateIndex
CREATE INDEX "Engagement_professionalProfileId_status_idx" ON "Engagement"("professionalProfileId", "status");

-- CreateIndex
CREATE INDEX "Engagement_clientUserId_status_idx" ON "Engagement"("clientUserId", "status");

-- CreateIndex
CREATE INDEX "Engagement_status_updatedAt_idx" ON "Engagement"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "EngagementMilestone_engagementId_sortOrder_idx" ON "EngagementMilestone"("engagementId", "sortOrder");

-- CreateIndex
CREATE INDEX "EngagementMilestone_engagementId_status_idx" ON "EngagementMilestone"("engagementId", "status");

-- CreateIndex
CREATE INDEX "EngagementDeliverable_engagementId_submittedAt_idx" ON "EngagementDeliverable"("engagementId", "submittedAt");

-- CreateIndex
CREATE INDEX "EngagementDeliverable_milestoneId_idx" ON "EngagementDeliverable"("milestoneId");

-- CreateIndex
CREATE INDEX "EngagementDeliverable_submittedById_idx" ON "EngagementDeliverable"("submittedById");

-- CreateIndex
CREATE INDEX "EngagementActivity_engagementId_createdAt_idx" ON "EngagementActivity"("engagementId", "createdAt");

-- CreateIndex
CREATE INDEX "EngagementActivity_authorId_idx" ON "EngagementActivity"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalPaymentAccount_accountCode_key" ON "ProfessionalPaymentAccount"("accountCode");

-- CreateIndex
CREATE INDEX "ProfessionalPaymentAccount_professionalProfileId_idx" ON "ProfessionalPaymentAccount"("professionalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementPayment_providerReference_key" ON "EngagementPayment"("providerReference");

-- CreateIndex
CREATE INDEX "EngagementPayment_engagementId_state_idx" ON "EngagementPayment"("engagementId", "state");

-- CreateIndex
CREATE INDEX "EngagementPayment_milestoneId_idx" ON "EngagementPayment"("milestoneId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_engagementPaymentId_idx" ON "PaymentTransaction"("engagementPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalPayout_providerReference_key" ON "ProfessionalPayout"("providerReference");

-- CreateIndex
CREATE INDEX "ProfessionalPayout_professionalProfileId_idx" ON "ProfessionalPayout"("professionalProfileId");

-- CreateIndex
CREATE INDEX "ProfessionalPayout_engagementPaymentId_idx" ON "ProfessionalPayout"("engagementPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_eventType_idx" ON "PaymentWebhookEvent"("provider", "eventType");

-- CreateIndex
CREATE INDEX "Refund_engagementPaymentId_idx" ON "Refund"("engagementPaymentId");

-- CreateIndex
CREATE INDEX "Refund_requestedById_idx" ON "Refund"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalReview_engagementId_key" ON "ProfessionalReview"("engagementId");

-- CreateIndex
CREATE INDEX "ProfessionalReview_professionalProfileId_idx" ON "ProfessionalReview"("professionalProfileId");

-- CreateIndex
CREATE INDEX "ProfessionalReview_clientUserId_idx" ON "ProfessionalReview"("clientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientReview_engagementId_key" ON "ClientReview"("engagementId");

-- CreateIndex
CREATE INDEX "ClientReview_clientUserId_idx" ON "ClientReview"("clientUserId");

-- CreateIndex
CREATE INDEX "ClientReview_professionalProfileId_idx" ON "ClientReview"("professionalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalMetrics_professionalProfileId_key" ON "ProfessionalMetrics"("professionalProfileId");

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "TalentOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TalentProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementMilestone" ADD CONSTRAINT "EngagementMilestone_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementDeliverable" ADD CONSTRAINT "EngagementDeliverable_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementDeliverable" ADD CONSTRAINT "EngagementDeliverable_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "EngagementMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementDeliverable" ADD CONSTRAINT "EngagementDeliverable_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementActivity" ADD CONSTRAINT "EngagementActivity_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementActivity" ADD CONSTRAINT "EngagementActivity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPaymentAccount" ADD CONSTRAINT "ProfessionalPaymentAccount_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementPayment" ADD CONSTRAINT "EngagementPayment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementPayment" ADD CONSTRAINT "EngagementPayment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "EngagementMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_engagementPaymentId_fkey" FOREIGN KEY ("engagementPaymentId") REFERENCES "EngagementPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPayout" ADD CONSTRAINT "ProfessionalPayout_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPayout" ADD CONSTRAINT "ProfessionalPayout_engagementPaymentId_fkey" FOREIGN KEY ("engagementPaymentId") REFERENCES "EngagementPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_engagementPaymentId_fkey" FOREIGN KEY ("engagementPaymentId") REFERENCES "EngagementPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalReview" ADD CONSTRAINT "ProfessionalReview_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalReview" ADD CONSTRAINT "ProfessionalReview_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalReview" ADD CONSTRAINT "ProfessionalReview_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReview" ADD CONSTRAINT "ClientReview_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalMetrics" ADD CONSTRAINT "ProfessionalMetrics_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
