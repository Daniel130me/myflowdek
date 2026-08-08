import { db } from '@/server/db/client';
import type { Prisma } from '@prisma/client';

/**
 * Audit log helper — appends an immutable record to the AuditLog table.
 *
 * Never throws: audit logging is a side-effect, not a critical path. If the
 * DB is down the request should still succeed (or fail for its own reason),
 * not because the audit write failed.
 *
 * Call from auth endpoints: register, login, login_failed, logout, etc.
 */

export interface AuditEntry {
  userId?: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
}

/** Cast the meta object to Prisma's JSON input type. */
function toJson(meta: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!meta) return undefined;
  return meta as Prisma.InputJsonValue;
}

/**
 * Persist an audit entry. Swallows errors so it never breaks the request flow.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        meta: toJson(entry.meta),
      },
    });
  } catch (err) {
    // Log but don't throw — audit failure must not break the request.
    console.error('[audit] failed to write entry:', entry.action, err);
  }
}
