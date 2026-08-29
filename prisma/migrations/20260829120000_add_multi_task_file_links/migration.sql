CREATE TABLE "TaskFile" (
    "taskId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskFile_pkey" PRIMARY KEY ("taskId", "fileId")
);

CREATE INDEX "TaskFile_fileId_idx" ON "TaskFile"("fileId");

ALTER TABLE "TaskFile"
ADD CONSTRAINT "TaskFile_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskFile"
ADD CONSTRAINT "TaskFile_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every existing single-task association as the first shared link.
INSERT INTO "TaskFile" ("taskId", "fileId", "createdAt")
SELECT "taskId", "id", "uploadedAt"
FROM "File"
WHERE "taskId" IS NOT NULL
ON CONFLICT ("taskId", "fileId") DO NOTHING;
