import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

/**
 * Standing campaign availability rules (policy only — not database events).
 * Future calendar steps materialize these as recurring blocked/default blocks
 * with explicit vacation / exception overrides.
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
  kind: "work_block" | "default_location" | "override_capable";
  weekdays: Weekday[];
  windows?: TimeWindow[];
  location?: string;
  summary: string;
  overrideAllowed: boolean;
  notes: string[];
};

/** Kelly still works Mon–Fri; campaign scheduling must treat these as unavailable by default. */
export const WORKDAY_UNAVAILABLE_WINDOWS: TimeWindow[] = [
  {
    start: "08:00",
    end: "12:00",
    label: "Day job — morning (unavailable)",
  },
  {
    start: "13:00",
    end: "17:00",
    label: "Day job — afternoon (unavailable)",
  },
];

export const STANDING_AVAILABILITY_RULES: StandingAvailabilityRule[] = [
  {
    id: "weekday-work-blocks",
    kind: "work_block",
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    windows: WORKDAY_UNAVAILABLE_WINDOWS,
    summary:
      "Monday–Friday 8:00 AM–12:00 PM and 1:00 PM–5:00 PM America/Chicago are unavailable work time.",
    overrideAllowed: true,
    notes: [
      "Override only when Kelly is on vacation or explicitly releases the block.",
      "Command Calendar must support vacation / exception overrides before scheduling into these windows.",
      "Lunch 12:00–1:00 PM is not auto-blocked by this rule.",
    ],
  },
  {
    id: "tuesday-little-rock-default",
    kind: "default_location",
    weekdays: ["Tuesday"],
    location: "Little Rock, Arkansas",
    summary: "Every Tuesday defaults to Little Rock unless staff overrides.",
    overrideAllowed: true,
    notes: [
      "Note this standing default on week, month, and campaign-year views from the beginning.",
      "Override when travel or remote Tuesday plans are confirmed.",
    ],
  },
  {
    id: "vacation-override",
    kind: "override_capable",
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    summary: "Vacation and explicit releases may open weekday work blocks for campaign time.",
    overrideAllowed: true,
    notes: [
      "Overrides must be human-approved and audited.",
      "AI may propose opening a block; it may not silently clear work unavailability.",
    ],
  },
];

export function getStandingAvailabilityPolicy() {
  const flags = getSharedAuthFlags();
  return {
    timezone: "America/Chicago" as const,
    rules: STANDING_AVAILABILITY_RULES,
    materialization: "pending_calendar_schema" as const,
    databaseEventsCreated: false,
    candidateData: flags.candidateDataReady,
  };
}
