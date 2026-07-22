/**
 * Standing campaign office hours are background busy time — not listed calendar events.
 * Detect / exclude them from operating views, counts, and workload math.
 */

export const STANDING_OFFICE_EVENT_TYPE = "Campaign Office Hours";
export const STANDING_OFFICE_INGEST_KEY_PREFIX = "[ingestKey:standing-office-";
export const STANDING_OFFICE_TITLE_MARKER =
  "Kelly Grappe – Secretary of State Campaign Office Hours";

export function isStandingWorkBlockEvent(input: {
  eventType?: string | null;
  internalTitle?: string | null;
  campaignDisplayTitle?: string | null;
  title?: string | null;
  privateNotes?: string | null;
  sourceType?: string | null;
}): boolean {
  if (input.eventType === STANDING_OFFICE_EVENT_TYPE) return true;
  if (input.privateNotes?.includes(STANDING_OFFICE_INGEST_KEY_PREFIX)) return true;
  const titles = [
    input.internalTitle,
    input.campaignDisplayTitle,
    input.title,
  ].filter(Boolean) as string[];
  if (titles.some((t) => t.includes(STANDING_OFFICE_TITLE_MARKER))) return true;
  if (
    input.sourceType === "SYSTEM" &&
    titles.some((t) => /campaign office hours/i.test(t))
  ) {
    return true;
  }
  return false;
}

/** Prisma where clause fragment: exclude standing office blocks from calendar loads. */
export const excludeStandingWorkBlocksWhere = {
  NOT: {
    OR: [
      { eventType: STANDING_OFFICE_EVENT_TYPE },
      { privateNotes: { startsWith: STANDING_OFFICE_INGEST_KEY_PREFIX } },
      { privateNotes: { contains: STANDING_OFFICE_INGEST_KEY_PREFIX } },
      {
        AND: [
          { sourceType: "SYSTEM" as const },
          { internalTitle: { contains: "Campaign Office Hours" } },
        ],
      },
    ],
  },
} as const;
