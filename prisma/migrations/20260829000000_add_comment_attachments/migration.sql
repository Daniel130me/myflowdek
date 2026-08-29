-- Persist reusable project-file references on comments.
CREATE TABLE "CommentAttachment" (
    "commentId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentAttachment_pkey" PRIMARY KEY ("commentId", "fileId")
);

CREATE INDEX "CommentAttachment_fileId_idx" ON "CommentAttachment"("fileId");

ALTER TABLE "CommentAttachment"
ADD CONSTRAINT "CommentAttachment_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentAttachment"
ADD CONSTRAINT "CommentAttachment_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
