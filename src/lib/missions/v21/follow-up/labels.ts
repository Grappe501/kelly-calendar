import type {
  MissionFollowUpActionStatus,
  MissionFollowUpOwnerType,
  MissionFollowUpPriority,
  MissionFollowUpSourceType,
  MissionFollowUpStatus,
} from "@/lib/missions/v21/follow-up/types";

export function labelFollowUpStatus(status: MissionFollowUpStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "ACTIVE":
      return "Active";
    case "READY_TO_CLOSE":
      return "Ready to close";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

export function labelFollowUpActionStatus(
  status: MissionFollowUpActionStatus,
): string {
  switch (status) {
    case "OPEN":
      return "Open";
    case "IN_PROGRESS":
      return "In progress";
    case "WAITING":
      return "Waiting";
    case "BLOCKED":
      return "Blocked";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function labelFollowUpActionPriority(
  priority: MissionFollowUpPriority,
): string {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "IMPORTANT":
      return "Important";
    case "NORMAL":
    default:
      return "Normal";
  }
}

export function labelFollowUpSource(source: MissionFollowUpSourceType): string {
  switch (source) {
    case "EXECUTE_COMMITMENT":
      return "From commitment made during Execute";
    case "EXECUTE_IMMEDIATE_FOLLOW_UP":
      return "From immediate follow-up in Execute";
    case "PERSON_RELATIONSHIP_NEXT_STEP":
      return "From person relationship next step";
    case "ORGANIZATION_RELATIONSHIP_NEXT_STEP":
      return "From organization relationship next step";
    case "UNRESOLVED_QUESTION":
      return "From unresolved question";
    case "SUCCESS_CRITERION_RECOVERY":
      return "From success-criterion recovery";
    case "LESSON_ACTION":
      return "From lesson requiring operational change";
    case "DEBRIEF_RECOMMENDED_ACTION":
      return "From approved Debrief action";
    case "OPERATOR_ADDED":
      return "Operator-added closeout work";
    case "MISSION_INCIDENT":
      return "From Mission Incident Log";
    default:
      return source;
  }
}

export function labelOwnerType(ownerType: MissionFollowUpOwnerType): string {
  switch (ownerType) {
    case "USER":
      return "User";
    case "ROLE":
      return "Role";
    case "EXTERNAL":
      return "External";
    case "UNASSIGNED":
    default:
      return "Owner needed";
  }
}

export function formatDueLabel(
  dueAt: string | null,
  now: Date,
  campaignTimezone: string,
): string {
  if (!dueAt) return "No due date";
  const dueDay = campaignDateKey(new Date(dueAt), campaignTimezone);
  const today = campaignDateKey(now, campaignTimezone);
  if (dueDay === today) return "Due today";
  const tomorrow = campaignDateKey(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    campaignTimezone,
  );
  if (dueDay === tomorrow) return "Due tomorrow";
  if (dueDay < today) {
    const days = Math.max(
      1,
      Math.round(
        (Date.parse(`${today}T12:00:00`) - Date.parse(`${dueDay}T12:00:00`)) /
          (24 * 60 * 60 * 1000),
      ),
    );
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }
  return `Due ${dueDay}`;
}

/** YYYY-MM-DD in campaign timezone (America/Chicago style). */
export function campaignDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
