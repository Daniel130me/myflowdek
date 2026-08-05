import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let client: PrismaClient;

try {
  client =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
} catch (e) {
  console.warn("[AI Studio] Prisma initialization failed, using fallback client:", e);
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
    count: async () => 0,
  };
  client = new Proxy({}, { get: () => noOp }) as unknown as PrismaClient;
}

export const db = client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
