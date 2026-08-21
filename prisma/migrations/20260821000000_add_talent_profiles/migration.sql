-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'FLOWDEK_USERS');
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE_NOW', 'AVAILABLE_SOON', 'LIMITED', 'UNAVAILABLE');
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'FIXED', 'NEGOTIABLE');
CREATE TYPE "ProficiencyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "RemotePreference" AS ENUM ('REMOTE_ONLY', 'HYBRID', 'ONSITE', 'FLEXIBLE');
CREATE TYPE "SkillCategory" AS ENUM ('SOFTWARE_DEVELOPMENT', 'DESIGN', 'PROJECT_MANAGEMENT', 'CLOUD_DEVOPS', 'DATA', 'MARKETING', 'BUSINESS', 'WRITING', 'QUALITY_ASSURANCE', 'SECURITY');

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "professionalTitle" TEXT,
    "bio" TEXT,
    "yearsOfExperience" INTEGER,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "location" TEXT,
    "timezone" TEXT,
    "remotePreference" "RemotePreference",
    "rateType" "RateType",
    "minimumRate" DECIMAL(12,2),
    "maximumRate" DECIMAL(12,2),
    "currency" CHAR(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalRole" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalProfileRole" (
    "profileId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "ProfessionalProfileRole_pkey" PRIMARY KEY ("profileId", "roleId")
);

CREATE TABLE "ProfessionalSkill" (
    "profileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" "ProficiencyLevel" NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalSkill_pkey" PRIMARY KEY ("profileId", "skillId")
);

CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalAvailability" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "weeklyAvailableHours" INTEGER,
    "availableFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");
CREATE UNIQUE INDEX "ProfessionalProfile_slug_key" ON "ProfessionalProfile"("slug");
CREATE INDEX "ProfessionalProfile_status_visibility_updatedAt_idx" ON "ProfessionalProfile"("status", "visibility", "updatedAt");
CREATE UNIQUE INDEX "ProfessionalRole_slug_key" ON "ProfessionalRole"("slug");
CREATE UNIQUE INDEX "ProfessionalRole_name_key" ON "ProfessionalRole"("name");
CREATE INDEX "ProfessionalRole_isActive_sortOrder_idx" ON "ProfessionalRole"("isActive", "sortOrder");
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE INDEX "Skill_category_isActive_sortOrder_idx" ON "Skill"("category", "isActive", "sortOrder");
CREATE INDEX "ProfessionalProfileRole_roleId_idx" ON "ProfessionalProfileRole"("roleId");
CREATE INDEX "ProfessionalSkill_skillId_proficiency_idx" ON "ProfessionalSkill"("skillId", "proficiency");
CREATE INDEX "PortfolioItem_profileId_sortOrder_idx" ON "PortfolioItem"("profileId", "sortOrder");
CREATE UNIQUE INDEX "ProfessionalAvailability_profileId_key" ON "ProfessionalAvailability"("profileId");

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalProfileRole" ADD CONSTRAINT "ProfessionalProfileRole_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalProfileRole" ADD CONSTRAINT "ProfessionalProfileRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ProfessionalRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalSkill" ADD CONSTRAINT "ProfessionalSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalSkill" ADD CONSTRAINT "ProfessionalSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalAvailability" ADD CONSTRAINT "ProfessionalAvailability_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
