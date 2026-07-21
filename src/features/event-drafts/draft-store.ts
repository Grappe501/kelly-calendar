import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { StagedEventDraft } from "@/features/event-drafts/draft-types";
import { stagedEventDraftSchema } from "@/features/event-drafts/draft-schema";
import { AppError, DatabaseUnavailableError } from "@/lib/security/safe-error";
import { prisma } from "@/server/db/prisma";

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

function rowToDraft(payload: unknown): StagedEventDraft {
  return payload as StagedEventDraft;
}

function draftTitle(draft: StagedEventDraft): string {
  return (
    draft.basic.campaignDisplayTitle ||
    draft.basic.internalTitle ||
    ""
  ).trim();
}

export async function saveDraft(input: unknown): Promise<StagedEventDraft> {
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
  let prior: StagedEventDraft | null = null;
  if (existingId) {
    prior = await getDraft(existingId);
  }

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
    databaseWriteAttempted: true,
    liveCalendar: false,
  };

  if (!draft.basic.internalTitle.trim() || !draft.basic.campaignDisplayTitle.trim()) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Title fields are required for a draft.",
    });
  }

  try {
    await prisma.eventPlanningDraft.upsert({
      where: { id: draft.draftId },
      create: {
        id: draft.draftId,
        status: draft.status,
        title: draftTitle(draft),
        primaryCalendar: draft.basic.primaryCalendar,
        payload: draft as unknown as Prisma.InputJsonValue,
        draftVersion: draft.draftVersion,
      },
      update: {
        status: draft.status,
        title: draftTitle(draft),
        primaryCalendar: draft.basic.primaryCalendar,
        payload: draft as unknown as Prisma.InputJsonValue,
        draftVersion: draft.draftVersion,
      },
    });
  } catch (cause) {
    throw new DatabaseUnavailableError(undefined, cause);
  }

  return draft;
}

export async function listDrafts(): Promise<StagedEventDraft[]> {
  try {
    const rows = await prisma.eventPlanningDraft.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return rows.map((row) => rowToDraft(row.payload));
  } catch (cause) {
    throw new DatabaseUnavailableError(undefined, cause);
  }
}

export async function getDraft(draftId: string): Promise<StagedEventDraft | null> {
  try {
    const row = await prisma.eventPlanningDraft.findUnique({
      where: { id: draftId },
    });
    return row ? rowToDraft(row.payload) : null;
  } catch (cause) {
    throw new DatabaseUnavailableError(undefined, cause);
  }
}

export async function deleteDraft(draftId: string): Promise<boolean> {
  try {
    const existing = await prisma.eventPlanningDraft.findUnique({
      where: { id: draftId },
      select: { id: true },
    });
    if (!existing) return false;
    await prisma.eventPlanningDraft.delete({ where: { id: draftId } });
    return true;
  } catch (cause) {
    throw new DatabaseUnavailableError(undefined, cause);
  }
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
