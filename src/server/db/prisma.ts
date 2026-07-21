import "server-only";

import { PrismaClient } from "@prisma/client";
import {
  applyLoadedEnvToProcess,
  loadApprovedEnvironment,
} from "@/lib/env/load-server-environment";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Ensure DATABASE_URL / DIRECT_URL are on process.env before Prisma reads them.
 * Safe to call repeatedly; never logs connection strings.
 */
export function ensurePrismaEnv(): void {
  const loaded = loadApprovedEnvironment();
  applyLoadedEnvToProcess(loaded);
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

function createPrismaClient(): PrismaClient {
  ensurePrismaEnv();
  return new PrismaClient({
    log:
      process.env.PRISMA_LOG_QUERIES === "true"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Server-only Prisma client. Never log connection strings.
 * Query logging disabled by default.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
