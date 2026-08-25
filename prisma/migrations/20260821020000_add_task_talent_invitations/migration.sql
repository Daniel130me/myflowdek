CREATE TYPE "TalentInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

CREATE TABLE "TaskCompetencyRequirement" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "minimumProficiency" "ProficiencyLevel" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaskCompetencyRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TalentInvitation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "message" TEXT,
    "proposedBudget" DECIMAL(12,2),
    "currency" CHAR(3),
    "proposedDeadline" TIMESTAMP(3),
    "status" "TalentInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TalentInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskCompetencyRequirement_taskId_skillId_key" ON "TaskCompetencyRequirement"("taskId", "skillId");
CREATE INDEX "TaskCompetencyRequirement_skillId_minimumProficiency_idx" ON "TaskCompetencyRequirement"("skillId", "minimumProficiency");
CREATE INDEX "TalentInvitation_taskId_status_createdAt_idx" ON "TalentInvitation"("taskId", "status", "createdAt");
CREATE INDEX "TalentInvitation_professionalProfileId_status_createdAt_idx" ON "TalentInvitation"("professionalProfileId", "status", "createdAt");
CREATE INDEX "TalentInvitation_invitedById_idx" ON "TalentInvitation"("invitedById");

-- Prevent concurrent duplicate pending invitations while preserving history.
CREATE UNIQUE INDEX "TalentInvitation_one_pending_per_task_profile" ON "TalentInvitation"("taskId", "professionalProfileId") WHERE "status" = 'PENDING';

ALTER TABLE "TaskCompetencyRequirement" ADD CONSTRAINT "TaskCompetencyRequirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskCompetencyRequirement" ADD CONSTRAINT "TaskCompetencyRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TalentInvitation" ADD CONSTRAINT "TalentInvitation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentInvitation" ADD CONSTRAINT "TalentInvitation_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentInvitation" ADD CONSTRAINT "TalentInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
