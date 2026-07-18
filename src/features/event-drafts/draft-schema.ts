import { z } from "zod";
import { PRIMARY_CALENDARS } from "@/features/event-drafts/arkansas-counties";

const checklistState = z.enum([
  "NOT_NEEDED",
  "NEEDED",
  "ASSIGNED",
  "PACKED",
  "LOADED",
  "DELIVERED",
  "RETURNED",
  "MISSING",
  "DONE",
  "PENDING",
]);

const primaryCalendarEnum = z.enum(
  PRIMARY_CALENDARS as unknown as [string, ...string[]],
);

export const stagedEventDraftSchema = z.object({
  draftId: z.string().min(3).max(80).optional(),
  draftVersion: z.number().int().positive().optional(),
  status: z
    .enum(["QUICK_DRAFT", "PLANNING", "READY_FOR_REVIEW", "APPROVED_FOR_FUTURE_SAVE"])
    .optional(),
  basic: z.object({
    primaryCalendar: primaryCalendarEnum,
    additionalCalendars: z.array(z.string().max(80)).max(20).default([]),
    eventType: z.string().min(1).max(120),
    internalTitle: z.string().min(1).max(500),
    campaignDisplayTitle: z.string().min(1).max(500),
    restrictedDisplayTitle: z.string().max(500).optional(),
    publicTitle: z.string().max(500).optional(),
    priority: z.string().max(40).default("Normal"),
    confirmationStatus: z.string().max(40).default("Hold"),
  }),
  timing: z.record(z.unknown()).default({ timezone: "America/Chicago" }),
  location: z.record(z.unknown()).default({
    state: "Arkansas",
    locationDisclosure: "CITY",
  }),
  people: z.record(z.unknown()).default({}),
  objectives: z.record(z.unknown()).default({}),
  programFlow: z.array(z.record(z.unknown())).max(100).default([]),
  packingItems: z.array(z.record(z.unknown())).max(200).default([]),
  staffing: z.array(z.record(z.unknown())).max(50).default([]),
  preEventActions: z.array(z.record(z.unknown())).max(100).default([]),
  eventDayActions: z.array(z.record(z.unknown())).max(100).default([]),
  postEventActions: z.array(z.record(z.unknown())).max(100).default([]),
  communicationsPlan: z.array(z.record(z.unknown())).max(50).default([]),
  travelPlan: z.record(z.unknown()).default({}),
  visibility: z
    .object({
      locationDisclosure: z.string().default("CITY"),
      generalVisibility: z.string().default("Campaign-wide limited"),
      showCalendarName: z.boolean().default(true),
      showSafeTitle: z.boolean().default(true),
      showGeneralLocation: z.boolean().default(true),
      showStartEnd: z.boolean().default(true),
      hideProtectedDetails: z.boolean().default(true),
      campaignDisplayTitle: z.string().optional(),
      restrictedDisplayTitle: z.string().optional(),
      publicTitle: z.string().optional(),
    })
    .default({
      locationDisclosure: "CITY",
      generalVisibility: "Campaign-wide limited",
      showCalendarName: true,
      showSafeTitle: true,
      showGeneralLocation: true,
      showStartEnd: true,
      hideProtectedDetails: true,
    }),
  aiSuggestionsApplied: z
    .array(
      z.object({
        suggestionId: z.string(),
        appliedAt: z.string(),
      }),
    )
    .default([]),
});

export type DraftInput = z.infer<typeof stagedEventDraftSchema>;

export { checklistState };
