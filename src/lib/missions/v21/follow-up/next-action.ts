import { campaignDateKey } from "@/lib/missions/v21/follow-up/labels";
import type {
  MissionFollowUpActionRecord,
  MissionFollowUpPriority,
} from "@/lib/missions/v21/follow-up/types";

const PRIORITY_RANK: Record<MissionFollowUpPriority, number> = {
  URGENT: 0,
  IMPORTANT: 1,
  NORMAL: 2,
};

export type NextActionContext = {
  now: Date;
  campaignTimezone: string;
};

function isTerminal(action: MissionFollowUpActionRecord): boolean {
  return action.status === "COMPLETED" || action.status === "CANCELLED";
}

function isWaitingDeferred(
  action: MissionFollowUpActionRecord,
  now: Date,
): boolean {
  if (action.status !== "WAITING") return false;
  if (!action.nextCheckAt) return false;
  return new Date(action.nextCheckAt).getTime() > now.getTime();
}

function isOverdue(
  action: MissionFollowUpActionRecord,
  now: Date,
  tz: string,
): boolean {
  if (!action.dueAt) return false;
  return campaignDateKey(new Date(action.dueAt), tz) < campaignDateKey(now, tz);
}

function isDueToday(
  action: MissionFollowUpActionRecord,
  now: Date,
  tz: string,
): boolean {
  if (!action.dueAt) return false;
  return campaignDateKey(new Date(action.dueAt), tz) === campaignDateKey(now, tz);
}

/**
 * Deterministic next-required-action selector.
 *
 * Precedence:
 * 1. Overdue URGENT
 * 2. Due-today URGENT
 * 3. Overdue IMPORTANT
 * 4. Due-today IMPORTANT
 * 5. Any other overdue
 * 6. Any due today
 * 7. Earliest due open/active action
 * 8. Highest-priority undated open action
 * 9. Blocked action requiring decision (after dated work)
 * 10. null
 *
 * Excludes COMPLETED/CANCELLED. Waiting before nextCheckAt is deprioritized
 * (not selected unless no other eligible work — then treated as blocked-like).
 */
export function selectNextRequiredAction(
  actions: MissionFollowUpActionRecord[],
  ctx: NextActionContext,
): MissionFollowUpActionRecord | null {
  const { now, campaignTimezone: tz } = ctx;
  const active = actions.filter((a) => !isTerminal(a));
  if (!active.length) return null;

  const eligible = active.filter((a) => !isWaitingDeferred(a, now));
  const pool = eligible.length ? eligible : active;

  const rank = (a: MissionFollowUpActionRecord): number[] => {
    const overdue = isOverdue(a, now, tz);
    const dueToday = isDueToday(a, now, tz);
    const pr = PRIORITY_RANK[a.priority];
    const blocked = a.status === "BLOCKED" ? 1 : 0;
    const waitingDeferred = isWaitingDeferred(a, now) ? 1 : 0;
    let band = 90;
    if (overdue && a.priority === "URGENT") band = 1;
    else if (dueToday && a.priority === "URGENT") band = 2;
    else if (overdue && a.priority === "IMPORTANT") band = 3;
    else if (dueToday && a.priority === "IMPORTANT") band = 4;
    else if (overdue) band = 5;
    else if (dueToday) band = 6;
    else if (a.dueAt) band = 7;
    else if (a.status !== "BLOCKED") band = 8;
    else band = 9;

    const dueMs = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return [
      band,
      waitingDeferred,
      blocked && band >= 9 ? 0 : blocked,
      pr,
      dueMs,
      a.sortOrder,
      // stable id tie-break
    ];
  };

  const sorted = [...pool].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return ra[i]! - rb[i]!;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted[0] ?? null;
}
