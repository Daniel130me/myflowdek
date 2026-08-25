-- CreateEnum
CREATE TYPE "ProjectDocumentPhase" AS ENUM ('INITIATION', 'PLANNING', 'EXECUTION_MONITORING', 'CLOSING');

-- CreateEnum
CREATE TYPE "TemplateDocumentType" AS ENUM ('GOOGLE_DOC', 'GOOGLE_SHEET', 'FLOWDEK_GENERATED');

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" "ProjectDocumentPhase" NOT NULL,
    "documentType" "TemplateDocumentType" NOT NULL,
    "content" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "tags" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "storageConnectionId" TEXT NOT NULL,
    "providerFileId" TEXT NOT NULL,
    "providerWebUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentTemplate_slug_key" ON "DocumentTemplate"("slug");
CREATE INDEX "DocumentTemplate_phase_isPublished_idx" ON "DocumentTemplate"("phase", "isPublished");
CREATE INDEX "DocumentTemplate_documentType_isPublished_idx" ON "DocumentTemplate"("documentType", "isPublished");
CREATE INDEX "ProjectDocument_projectId_createdAt_idx" ON "ProjectDocument"("projectId", "createdAt");
CREATE INDEX "ProjectDocument_templateId_idx" ON "ProjectDocument"("templateId");
CREATE INDEX "ProjectDocument_createdById_idx" ON "ProjectDocument"("createdById");
CREATE INDEX "ProjectDocument_storageConnectionId_idx" ON "ProjectDocument"("storageConnectionId");

ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_storageConnectionId_fkey" FOREIGN KEY ("storageConnectionId") REFERENCES "StorageConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;