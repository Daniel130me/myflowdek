import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 service — generates presigned URLs for direct browser uploads
 * and downloads.
 *
 * Flow:
 *   1. Browser asks Flowdek for a presigned PUT URL (POST /presign)
 *   2. Flowdek verifies permissions + generates a presigned URL
 *   3. Browser uploads the file directly to R2 using the presigned URL
 *   4. Browser tells Flowdek the upload is done (POST /confirm)
 *   5. Flowdek stores the file metadata (name, size, mimeType, r2Key) in the DB
 *
 * The application server never handles the binary file — only metadata.
 */

/** How long a presigned upload URL stays valid (5 minutes). */
const UPLOAD_URL_TTL_SECONDS = 300;

/** How long a presigned download URL stays valid (1 hour). */
const DOWNLOAD_URL_TTL_SECONDS = 3600;

/** Build the R2 client from environment variables. */
function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  // R2 uses the S3 API with a custom endpoint.
  const endpoint = process.env.R2_ENDPOINT
    ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Get the R2 bucket name from the environment. */
function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME ?? process.env.R2_BUCKET;
  if (!bucket) throw new Error('R2 bucket name not configured');
  return bucket;
}

/**
 * Generate a presigned PUT URL for the browser to upload a file directly to R2.
 *
 * The `r2Key` is a path within the bucket (e.g. "projects/p1/uploads/abc.pdf").
 * The caller controls the key so it can be structured per-project.
 */
export async function generatePresignedUploadUrl(
  r2Key: string,
  mimeType: string,
  size: number,
): Promise<string> {
  const client = getR2Client();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: r2Key,
    ContentType: mimeType,
    ContentLength: size,
  });

  return getSignedUrl(client, command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
}

/**
 * Generate a presigned GET URL for the browser to download a file from R2.
 */
export async function generatePresignedDownloadUrl(r2Key: string): Promise<string> {
  const client = getR2Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: r2Key,
  });

  return getSignedUrl(client, command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });
}

/**
 * Build a structured R2 key for a project file upload.
 * Format: projects/{projectId}/{timestamp}-{random}.{ext}
 */
export function buildR2Key(projectId: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `projects/${projectId}/${timestamp}-${random}.${ext}`;
}
