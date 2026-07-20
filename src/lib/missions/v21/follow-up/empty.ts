import type { MissionFollowUpRecord } from "@/lib/missions/v21/follow-up/types";

export function emptyMissionFollowUp(missionId: string): MissionFollowUpRecord {
  const now = new Date(0).toISOString();
  return {
    id: "",
    missionId,
    followUpStatus: "NOT_STARTED",
    startedAt: null,
    completedAt: null,
    closedAt: null,
    closeoutSummary: null,
    unresolvedSummary: null,
    internalNotes: null,
    startedByUserId: null,
    closedByUserId: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
    actions: [],
  };
}
