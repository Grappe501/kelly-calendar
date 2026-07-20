import { campaignDateKey } from "@/lib/missions/v21/follow-up/labels";
import type { MissionFollowUpActionRecord } from "@/lib/missions/v21/follow-up/types";

export type FollowUpAccountabilitySummary = {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  blocked: number;
  overdue: number;
  dueToday: number;
  dueWithinSevenDays: number;
  unassigned: number;
  completed: number;
  cancelled: number;
};

export function buildFollowUpSummary(
  actions: MissionFollowUpActionRecord[],
  now: Date,
  campaignTimezone: string,
): FollowUpAccountabilitySummary {
  const today = campaignDateKey(now, campaignTimezone);
  const inSeven = campaignDateKey(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    campaignTimezone,
  );

  const summary: FollowUpAccountabilitySummary = {
    total: actions.length,
    open: 0,
    inProgress: 0,
    waiting: 0,
    blocked: 0,
    overdue: 0,
    dueToday: 0,
    dueWithinSevenDays: 0,
    unassigned: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const a of actions) {
    if (a.status === "OPEN") summary.open++;
    if (a.status === "IN_PROGRESS") summary.inProgress++;
    if (a.status === "WAITING") summary.waiting++;
    if (a.status === "BLOCKED") summary.blocked++;
    if (a.status === "COMPLETED") summary.completed++;
    if (a.status === "CANCELLED") summary.cancelled++;
    if (
      a.ownerType === "UNASSIGNED" &&
      a.status !== "COMPLETED" &&
      a.status !== "CANCELLED"
    ) {
      summary.unassigned++;
    }
    if (
      a.dueAt &&
      a.status !== "COMPLETED" &&
      a.status !== "CANCELLED"
    ) {
      const day = campaignDateKey(new Date(a.dueAt), campaignTimezone);
      if (day < today) summary.overdue++;
      if (day === today) summary.dueToday++;
      if (day >= today && day <= inSeven) summary.dueWithinSevenDays++;
    }
  }

  return summary;
}
