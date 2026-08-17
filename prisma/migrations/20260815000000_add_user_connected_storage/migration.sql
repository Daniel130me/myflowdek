-- File bytes remain in the cloud account connected by each Flowdek user.
-- The transaction prevents a partially applied storage schema on failure.
BEGIN;

CREATE TYPE "StorageProvider" AS ENUM ('GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX');

CREATE TABLE "StorageConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "providerAccountId" TEXT,
    "providerEmail" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StorageConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "File"
ADD COLUMN "storageProvider" "StorageProvider",
ADD COLUMN "storageConnectionId" TEXT,
ADD COLUMN "providerFileId" TEXT,
ADD COLUMN "providerPath" TEXT,
ADD COLUMN "providerWebUrl" TEXT;

CREATE UNIQUE INDEX "StorageConnection_userId_provider_key"
ON "StorageConnection"("userId", "provider");
CREATE INDEX "StorageConnection_userId_idx" ON "StorageConnection"("userId");
CREATE INDEX "File_storageConnectionId_idx" ON "File"("storageConnectionId");

ALTER TABLE "StorageConnection"
ADD CONSTRAINT "StorageConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "File"
ADD CONSTRAINT "File_storageConnectionId_fkey"
FOREIGN KEY ("storageConnectionId") REFERENCES "StorageConnection"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
