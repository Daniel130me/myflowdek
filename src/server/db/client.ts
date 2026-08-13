import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * In development we cache the client on globalThis so Fast Refresh / hot
 * module reloads don't spawn dozens of connection pools. In production a
 * fresh client is created per process.
 *
 * Failures are NOT masked. If Prisma cannot initialise (bad URL, network,
 * schema drift) the error is thrown so the request fails loudly and the real
 * cause is logged. Never simulate a working database.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
