/**
 * Canonical Event — Campaign Operating System atomic unit.
 *
 * Governing principles (locked for Step 9+):
 * 1. Exactly one top-level Event entity (Prisma model `Event`).
 * 2. Mission, Travel, Briefing, Tasks, etc. are capabilities attached to Event — never parallel Events.
 * 3. Relationships are references to Person / Organization / County / Place — never copied PII blobs.
 * 4. The Event grows via optional modules; it does not multiply into CalendarEvent / MissionEvent / etc.
 *
 * Build: KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL-1.0
 */

/** Forbidden competing top-level entity names — never introduce these Prisma models. */
export const FORBIDDEN_COMPETING_EVENT_MODEL_NAMES = [
  "CalendarEvent",
  "CampaignEvent",
  "MissionEvent",
  "ScheduleEvent",
  "MeetingEvent",
  "OpsEvent",
  "FieldEvent",
] as const;

/** Prisma table of record for schedule truth. */
export const CANONICAL_EVENT_MODEL = "Event" as const;

/**
 * Operator-facing lifecycle (product language).
 * Derived from EventStatus + optional readiness / follow-up signals — not a second status column.
 */
export type EventOperationalLifecycle =
  | "DRAFT"
  | "SCHEDULED"
  | "PREPARING"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FOLLOW_UP"
  | "ARCHIVED";

/** Persistence statuses on Event.status (schema enum EventStatus). */
export type EventPersistenceStatus =
  | "DRAFT"
  | "REQUESTED"
  | "TENTATIVE"
  | "HOLD"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DECLINED"
  | "POSTPONED"
  | "ARCHIVED";

export type EventLifecycleSignals = {
  status: EventPersistenceStatus;
  archivedAt?: Date | string | null;
  readinessState?: "UNKNOWN" | "BLOCKED" | "PREPARING" | "READY" | null;
  openFollowUpCount?: number;
};

/**
 * Map persistence status (+ optional signals) → operator lifecycle.
 * Cancelled / declined remain SCHEDULED-or-earlier branch until archived.
 */
export function deriveEventOperationalLifecycle(
  input: EventLifecycleSignals,
): EventOperationalLifecycle {
  if (input.archivedAt || input.status === "ARCHIVED") return "ARCHIVED";
  if (input.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (input.status === "COMPLETED") {
    if ((input.openFollowUpCount ?? 0) > 0) return "FOLLOW_UP";
    return "COMPLETED";
  }
  if (input.status === "DRAFT" || input.status === "REQUESTED") return "DRAFT";
  if (
    input.status === "CANCELLED" ||
    input.status === "DECLINED"
  ) {
    return "SCHEDULED";
  }
  // TENTATIVE / HOLD / UNDER_REVIEW / APPROVED / CONFIRMED / POSTPONED
  if (input.readinessState === "READY") return "READY";
  if (input.readinessState === "PREPARING" || input.readinessState === "BLOCKED") {
    return "PREPARING";
  }
  if (input.status === "CONFIRMED" || input.status === "APPROVED") {
    return "PREPARING";
  }
  return "SCHEDULED";
}

export const EVENT_OPERATIONAL_LIFECYCLE_ORDER: EventOperationalLifecycle[] = [
  "DRAFT",
  "SCHEDULED",
  "PREPARING",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "FOLLOW_UP",
  "ARCHIVED",
];

/**
 * Capability modules that hang off Event.
 * `implemented` = schema + service path exists today.
 * `reserved` = attachment point documented; empty / deferred OK.
 */
export type EventCapabilityModule = {
  key: string;
  title: string;
  prismaModels: string[];
  implemented: boolean;
  reservedForStep?: string;
  notes: string;
};

export const EVENT_CAPABILITY_MODULES: EventCapabilityModule[] = [
  {
    key: "time",
    title: "Time",
    prismaModels: ["Event"],
    implemented: true,
    notes: "startsAt/endsAt/timezone/all-day/multi-day/buffers/recurrence fields on Event",
  },
  {
    key: "location",
    title: "Location",
    prismaModels: ["Event", "Place", "EventGeography", "ArkansasCounty", "ArkansasRegion"],
    implemented: true,
    notes: "Physical + virtual on Event; Place/Geography for richer geo",
  },
  {
    key: "visibility",
    title: "Visibility",
    prismaModels: [
      "Event",
      "EventVisibilityOverride",
      "EventSectionPermission",
      "EventCalendarMembership",
    ],
    implemented: true,
    notes: "defaultVisibility + overrides + section ACL + calendar memberships",
  },
  {
    key: "participants",
    title: "Participants",
    prismaModels: ["EventPerson", "EventOrganization", "Person", "Organization"],
    implemented: true,
    notes: "References to canonical Person/Organization — never duplicate contact rows on Event",
  },
  {
    key: "staff",
    title: "Staff Assignments",
    prismaModels: ["EventStaffAssignment"],
    implemented: true,
    notes: "Campaign staff roles on the Event; Mission staffing is a later operational pack",
  },
  {
    key: "purpose",
    title: "Purpose / Objectives",
    prismaModels: ["EventObjective", "EventOutcome"],
    implemented: true,
    notes: "Why we are going; success definition; post outcomes",
  },
  {
    key: "preparation",
    title: "Preparation",
    prismaModels: ["EventPackingItem", "EventProgramFlowItem", "EventObjective"],
    implemented: true,
    notes: "Pre-event packing + run-of-show; MissionPreparation is attached via Mission module",
  },
  {
    key: "execution",
    title: "Execution",
    prismaModels: ["EventProgramFlowItem", "EventActionItem"],
    implemented: true,
    notes: "Agenda / checklists / tasks during the Event",
  },
  {
    key: "mission",
    title: "Mission",
    prismaModels: ["CampaignMission"],
    implemented: true,
    notes:
      "1:1 projection from Event — Mission is NOT an Event; operational packs hang off CampaignMission",
  },
  {
    key: "travel",
    title: "Travel",
    prismaModels: ["EventTravelPlan", "EventTravelSegment", "CampaignTravelLeg"],
    implemented: true,
    notes: "Event-owned travel plan; legs between Events are CampaignTravelLeg",
  },
  {
    key: "briefing",
    title: "Briefing",
    prismaModels: ["EventBriefing"],
    implemented: true,
    reservedForStep: "18",
    notes: "Schema present; deepen UX in briefing step — do not invent BriefingEvent",
  },
  {
    key: "notes",
    title: "Notes",
    prismaModels: ["EventNote", "Event"],
    implemented: true,
    notes: "EventNote rows + Event.privateNotes",
  },
  {
    key: "tasks",
    title: "Tasks",
    prismaModels: ["EventActionItem"],
    implemented: true,
    notes: "Phased action items (before/during/after)",
  },
  {
    key: "follow_up",
    title: "Follow-up",
    prismaModels: ["EventFollowup"],
    implemented: true,
    reservedForStep: "19",
    notes: "Event follow-ups; MissionFollowUp is mission-pack depth",
  },
  {
    key: "attachments",
    title: "Attachments",
    prismaModels: ["EventFile", "EventLink"],
    implemented: true,
    notes: "Files + links; storage keys never expose secrets in client",
  },
  {
    key: "ai_context",
    title: "AI Context",
    prismaModels: ["AiSuggestionRun", "AiFieldSuggestion", "OperationalRecommendationRecord"],
    implemented: true,
    reservedForStep: "16",
    notes: "proposal_only; AI disabled until Step 16",
  },
  {
    key: "audit",
    title: "Audit",
    prismaModels: ["EventStatusHistory", "AuditLog", "DataAccessLog"],
    implemented: true,
    notes: "Status history on Event; polymorphic AuditLog for mutations",
  },
  {
    key: "external_calendar",
    title: "External Calendar References",
    prismaModels: ["ExternalEventIdentity", "CalendarImportRecord"],
    implemented: true,
    reservedForStep: "22",
    notes: "Import identities; sync in Steps 22–23 — Event remains master",
  },
  {
    key: "communications",
    title: "Communications",
    prismaModels: ["EventCommunicationsItem"],
    implemented: true,
    reservedForStep: "later",
    notes:
      "Event panel attachment only; D20–D26 Communications OS remains FROZEN — soft eventId refs later",
  },
  {
    key: "expenses",
    title: "Expenses",
    prismaModels: [],
    implemented: false,
    reservedForStep: "future",
    notes: "Reserved — attach later without new Event entity",
  },
  {
    key: "media",
    title: "Media / Press",
    prismaModels: [],
    implemented: false,
    reservedForStep: "future",
    notes: "Reserved attachment point",
  },
  {
    key: "security_detail",
    title: "Security Detail",
    prismaModels: [],
    implemented: false,
    reservedForStep: "future",
    notes: "Reserved; section ACL already anticipates security visibility",
  },
  {
    key: "volunteer_coordination",
    title: "Volunteer Coordination",
    prismaModels: [],
    implemented: false,
    reservedForStep: "21",
    notes: "Reserved for volunteer scheduling step",
  },
  {
    key: "fundraising",
    title: "Fundraising",
    prismaModels: [],
    implemented: false,
    reservedForStep: "future",
    notes: "Reserved; section ACL anticipates fundraising visibility",
  },
  {
    key: "voter_outreach",
    title: "Voter Outreach",
    prismaModels: [],
    implemented: false,
    reservedForStep: "future",
    notes: "Reserved — references people/orgs, never duplicates Event",
  },
];

export function assertNoCompetingEventModelName(modelName: string): void {
  if (
    (FORBIDDEN_COMPETING_EVENT_MODEL_NAMES as readonly string[]).includes(modelName)
  ) {
    throw new Error(
      `Forbidden competing event model "${modelName}". Use canonical Prisma model "${CANONICAL_EVENT_MODEL}" and attach capability modules.`,
    );
  }
}
