-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "TalentOpportunity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deliverablesSummary" TEXT,
    "budgetType" "RateType",
    "minimumBudget" DECIMAL(12,2),
    "maximumBudget" DECIMAL(12,2),
    "currency" CHAR(3),
    "expectedDuration" TEXT,
    "applicationDeadline" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySkillRequirement" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "minimumProficiency" "ProficiencyLevel" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunitySkillRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentProposal" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "proposedPrice" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "estimatedDuration" TEXT NOT NULL,
    "coverMessage" TEXT NOT NULL,
    "proposedApproach" TEXT,
    "milestoneSuggestions" JSONB,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalentOpportunity_status_publishedAt_idx" ON "TalentOpportunity"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "TalentOpportunity_taskId_status_idx" ON "TalentOpportunity"("taskId", "status");

-- CreateIndex
CREATE INDEX "TalentOpportunity_createdById_idx" ON "TalentOpportunity"("createdById");

-- CreateIndex
CREATE INDEX "OpportunitySkillRequirement_skillId_minimumProficiency_idx" ON "OpportunitySkillRequirement"("skillId", "minimumProficiency");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySkillRequirement_opportunityId_skillId_key" ON "OpportunitySkillRequirement"("opportunityId", "skillId");

-- CreateIndex
CREATE INDEX "TalentProposal_opportunityId_status_createdAt_idx" ON "TalentProposal"("opportunityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TalentProposal_professionalProfileId_status_createdAt_idx" ON "TalentProposal"("professionalProfileId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TalentProposal_opportunityId_professionalProfileId_key" ON "TalentProposal"("opportunityId", "professionalProfileId");

-- AddForeignKey
ALTER TABLE "TalentOpportunity" ADD CONSTRAINT "TalentOpportunity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentOpportunity" ADD CONSTRAINT "TalentOpportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySkillRequirement" ADD CONSTRAINT "OpportunitySkillRequirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "TalentOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySkillRequirement" ADD CONSTRAINT "OpportunitySkillRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProposal" ADD CONSTRAINT "TalentProposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "TalentOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProposal" ADD CONSTRAINT "TalentProposal_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
