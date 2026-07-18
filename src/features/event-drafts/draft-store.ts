import "server-only";

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { StagedEventDraft } from "@/features/event-drafts/draft-types";
import { stagedEventDraftSchema } from "@/features/event-drafts/draft-schema";
import { AppError } from "@/lib/security/safe-error";

const DRAFTS_DIR = path.join(process.cwd(), "data", "ingest_staging", "drafts");

function ensure(): void {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

function draftPath(draftId: string): string {
  return path.join(DRAFTS_DIR, `${draftId}.json`);
}

export function createEmptyDraft(
  partial?: Partial<StagedEventDraft>,
): StagedEventDraft {
  const now = new Date().toISOString();
  const draftId = `draft_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const base: StagedEventDraft = {
    draftId,
    draftVersion: 1,
    createdAt: now,
    updatedAt: now,
    status: "QUICK_DRAFT",
    basic: {
      primaryCalendar: "Public Events",
      additionalCalendars: [],
      eventType: "Other",
      internalTitle: "",
      campaignDisplayTitle: "",
      priority: "Normal",
      confirmationStatus: "Hold",
    },
    timing: { timezone: "America/Chicago", allDay: false },
    location: {
      state: "Arkansas",
      locationDisclosure: "CITY",
    },
    people: {},
    objectives: {},
    programFlow: [],
    packingItems: [],
    staffing: [],
    preEventActions: [],
    eventDayActions: [],
    postEventActions: [],
    communicationsPlan: [],
    travelPlan: {},
    visibility: {
      locationDisclosure: "CITY",
      generalVisibility: "Campaign-wide limited",
      showCalendarName: true,
      showSafeTitle: true,
      showGeneralLocation: true,
      showStartEnd: true,
      hideProtectedDetails: true,
    },
    aiSuggestionsApplied: [],
    databaseWriteAttempted: false,
    liveCalendar: false,
  };
  return {
    ...base,
    ...partial,
    draftId: partial?.draftId ?? draftId,
    databaseWriteAttempted: false,
    liveCalendar: false,
  };
}

export function saveDraft(input: unknown): StagedEventDraft {
  ensure();
  const parsed = stagedEventDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Draft failed validation. Check dropdown and checkbox values.",
      internalMessage: parsed.error.message,
    });
  }

  const existingId = parsed.data.draftId;
  const prior = existingId && fs.existsSync(draftPath(existingId))
    ? (JSON.parse(fs.readFileSync(draftPath(existingId), "utf8")) as StagedEventDraft)
    : null;

  const base = prior ?? createEmptyDraft();
  const now = new Date().toISOString();
  const draft: StagedEventDraft = {
    ...base,
    ...parsed.data,
    draftId: existingId || base.draftId,
    draftVersion: (prior?.draftVersion ?? 0) + 1,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
    basic: { ...base.basic, ...parsed.data.basic },
    timing: { ...base.timing, ...(parsed.data.timing as StagedEventDraft["timing"]) },
    location: {
      ...base.location,
      ...(parsed.data.location as StagedEventDraft["location"]),
    },
    people: { ...base.people, ...(parsed.data.people as StagedEventDraft["people"]) },
    objectives: {
      ...base.objectives,
      ...(parsed.data.objectives as StagedEventDraft["objectives"]),
    },
    programFlow: (parsed.data.programFlow as StagedEventDraft["programFlow"]) ?? base.programFlow,
    packingItems:
      (parsed.data.packingItems as StagedEventDraft["packingItems"]) ?? base.packingItems,
    staffing: (parsed.data.staffing as StagedEventDraft["staffing"]) ?? base.staffing,
    preEventActions:
      (parsed.data.preEventActions as StagedEventDraft["preEventActions"]) ??
      base.preEventActions,
    eventDayActions:
      (parsed.data.eventDayActions as StagedEventDraft["eventDayActions"]) ??
      base.eventDayActions,
    postEventActions:
      (parsed.data.postEventActions as StagedEventDraft["postEventActions"]) ??
      base.postEventActions,
    communicationsPlan:
      (parsed.data.communicationsPlan as StagedEventDraft["communicationsPlan"]) ??
      base.communicationsPlan,
    travelPlan: {
      ...base.travelPlan,
      ...(parsed.data.travelPlan as StagedEventDraft["travelPlan"]),
    },
    visibility: {
      ...base.visibility,
      ...parsed.data.visibility,
    },
    aiSuggestionsApplied:
      parsed.data.aiSuggestionsApplied ?? base.aiSuggestionsApplied,
    databaseWriteAttempted: false,
    liveCalendar: false,
  };

  if (!draft.basic.internalTitle.trim() || !draft.basic.campaignDisplayTitle.trim()) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Title fields are required for a draft.",
    });
  }

  fs.writeFileSync(draftPath(draft.draftId), JSON.stringify(draft, null, 2), "utf8");
  return draft;
}

export function listDrafts(): StagedEventDraft[] {
  ensure();
  return fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) =>
        JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), "utf8")) as StagedEventDraft,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDraft(draftId: string): StagedEventDraft | null {
  ensure();
  const file = draftPath(draftId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as StagedEventDraft;
}

export function deleteDraft(draftId: string): boolean {
  ensure();
  const file = draftPath(draftId);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

export function unassignedRequiredRoles(draft: StagedEventDraft): string[] {
  const gaps: string[] = [];
  if (draft.people.communicationsNeeded) {
    const assigned = draft.staffing.find(
      (s) => s.role === "Communications lead" && s.assignedPerson,
    );
    if (!assigned) gaps.push("Communications lead");
  }
  if (draft.people.driverNeeded) {
    const assigned = draft.staffing.find(
      (s) => s.role === "Travel lead" && s.assignedPerson,
    );
    if (!assigned) gaps.push("Travel lead / driver");
  }
  if (draft.people.volunteerLeadNeeded) {
    const assigned = draft.staffing.find(
      (s) => s.role === "Volunteer lead" && s.assignedPerson,
    );
    if (!assigned) gaps.push("Volunteer lead");
  }
  return gaps;
}
