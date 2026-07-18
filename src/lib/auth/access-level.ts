import type { CalendarPermission } from "@/lib/calendar-security/calendar-access-types";

const RANK: Record<string, number> = {
  NO_ACCESS: 0,
  AVAILABILITY_ONLY: 1,
  VIEW_LIMITED: 2,
  VIEW_FULL: 3,
  VIEW: 3,
  CONTRIBUTE: 4,
  EDIT: 5,
  MANAGE: 6,
  ADMINISTER: 7,
};

export function accessLevelRank(level: string): number {
  return RANK[level] ?? 0;
}

export function maxAccessLevel(a: string, b: string): string {
  return accessLevelRank(a) >= accessLevelRank(b) ? a : b;
}

/** Map Prisma CalendarAccessLevel → ViewerContext CalendarPermission vocabulary. */
export function toViewerPermission(level: string): CalendarPermission {
  if (level === "VIEW_LIMITED" || level === "VIEW_FULL") return "VIEW";
  if (
    level === "NO_ACCESS" ||
    level === "AVAILABILITY_ONLY" ||
    level === "CONTRIBUTE" ||
    level === "EDIT" ||
    level === "MANAGE" ||
    level === "ADMINISTER"
  ) {
    return level;
  }
  return "NO_ACCESS";
}

export function canMutateAtAccessLevel(level: string): boolean {
  return accessLevelRank(level) >= RANK.EDIT;
}
