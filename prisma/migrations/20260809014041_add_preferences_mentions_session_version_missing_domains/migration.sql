-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recurrence" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WorkspacePreference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultView" TEXT,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspacePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentMention" (
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CommentMention_pkey" PRIMARY KEY ("commentId","userId")
);

-- CreateTable
CREATE TABLE "ProjectStatusUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'green',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCustomFieldValue" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "TaskCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspacePreference_userId_idx" ON "WorkspacePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePreference_workspaceId_userId_key" ON "WorkspacePreference"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "CommentMention_userId_idx" ON "CommentMention"("userId");

-- CreateIndex
CREATE INDEX "ProjectStatusUpdate_projectId_idx" ON "ProjectStatusUpdate"("projectId");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_idx" ON "SavedFilter"("userId");

-- CreateIndex
CREATE INDEX "CustomField_projectId_idx" ON "CustomField"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_projectId_key_key" ON "CustomField"("projectId", "key");

-- CreateIndex
CREATE INDEX "TaskCustomFieldValue_taskId_idx" ON "TaskCustomFieldValue"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCustomFieldValue_taskId_fieldId_key" ON "TaskCustomFieldValue"("taskId", "fieldId");

-- AddForeignKey
ALTER TABLE "WorkspacePreference" ADD CONSTRAINT "WorkspacePreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePreference" ADD CONSTRAINT "WorkspacePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStatusUpdate" ADD CONSTRAINT "ProjectStatusUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStatusUpdate" ADD CONSTRAINT "ProjectStatusUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCustomFieldValue" ADD CONSTRAINT "TaskCustomFieldValue_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCustomFieldValue" ADD CONSTRAINT "TaskCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
