import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

/**
 * Standing campaign availability / office-hour rhythm (policy + optional materialization).
 * Campaign missions, travel, and major events override these defaults (Doctrine #1).
 */

export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type TimeWindow = {
  start: string; // HH:mm America/Chicago
  end: string;
  label: string;
};

export type StandingAvailabilityRule = {
  id: string;
  kind: "work_block" | "default_location" | "override_capable" | "open_window";
  weekdays: Weekday[];
  windows?: TimeWindow[];
  location?: string;
  summary: string;
  overrideAllowed: boolean;
  notes: string[];
};

/** Default Mon–Fri campaign office hours (Busy). Lunch is intentionally open. */
export const WORKDAY_OFFICE_WINDOWS: TimeWindow[] = [
  {
    start: "08:00",
    end: "12:00",
    label: "Kelly Grappe – Secretary of State Campaign Office Hours (morning)",
  },
  {
    start: "13:00",
    end: "17:00",
    label: "Kelly Grappe – Secretary of State Campaign Office Hours (afternoon)",
  },
];

/** @deprecated Use WORKDAY_OFFICE_WINDOWS — kept for older imports */
export const WORKDAY_UNAVAILABLE_WINDOWS = WORKDAY_OFFICE_WINDOWS;

export const STANDING_AVAILABILITY_RULES: StandingAvailabilityRule[] = [
  {
    id: "weekday-campaign-office-hours",
    kind: "work_block",
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    windows: WORKDAY_OFFICE_WINDOWS,
    summary:
      "Monday–Friday 8:00 AM–12:00 PM and 1:00 PM–5:00 PM America/Chicago are Campaign Office Hours (Busy).",
    overrideAllowed: true,
    notes: [
      "Title: Kelly Grappe – Secretary of State Campaign Office Hours.",
      "Typical work: correspondence, admin, staff/media/finance, strategy, volunteers, RCC follow-up, event/travel prep.",
      "Campaign events, travel, festivals, rallies, immersions, debates, and major meetings OVERRIDE these blocks.",
      "Vacation / explicit release may also open a block (human-approved, audited).",
    ],
  },
  {
    id: "weekday-lunch-open",
    kind: "open_window",
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    windows: [{ start: "12:00", end: "13:00", label: "Lunch — open unless scheduled" }],
    summary: "Monday–Friday 12:00 PM–1:00 PM stays open unless an event is scheduled.",
    overrideAllowed: true,
    notes: [
      "Do not auto-block lunch.",
      "Use for lunch meetings, donors, media, community leaders, or personal time.",
    ],
  },
  {
    id: "tuesday-little-rock-office",
    kind: "default_location",
    weekdays: ["Tuesday"],
    location: "Little Rock Campaign Office",
    summary:
      "Every Tuesday defaults to the Little Rock Campaign Office (8:00–5:00 with noon lunch open) unless a statewide mission or travel supersedes.",
    overrideAllowed: true,
    notes: [
      "Reserved for staff coordination, governmental/press/finance meetings, planning, vendors, content, RCC, admin.",
      "Override when a campaign mission or major event is already scheduled.",
    ],
  },
  {
    id: "mission-override",
    kind: "override_capable",
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    summary:
      "Dated campaign missions replace standing office hours for the overlapping windows.",
    overrideAllowed: true,
    notes: [
      "Examples: Jefferson immersion Aug 12–13; NWA immersion Aug 18–20; Miller immersion Aug 24.",
      "System must not silently clear operator-defined mission reality (Doctrine #1).",
    ],
  },
];

export function getStandingAvailabilityPolicy() {
  const flags = getSharedAuthFlags();
  return {
    timezone: "America/Chicago" as const,
    rules: STANDING_AVAILABILITY_RULES,
    officeHoursTitle: "Kelly Grappe – Secretary of State Campaign Office Hours",
    materialization: "event_materialization_supported" as const,
    databaseEventsCreated: true,
    candidateData: flags.candidateDataReady,
  };
}
