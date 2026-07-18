import "server-only";

import { prisma } from "@/server/db/prisma";

export async function listActiveEventTemplates() {
  return prisma.eventTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getEventTemplateBySlug(slug: string) {
  return prisma.eventTemplate.findFirst({ where: { slug, isActive: true } });
}
