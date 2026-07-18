import "server-only";

import { prisma } from "@/server/db/prisma";

/** Run work inside a Prisma interactive transaction. */
export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => fn(tx));
}
