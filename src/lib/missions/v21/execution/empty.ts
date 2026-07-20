import type { MissionExecutionRecord } from "@/lib/missions/v21/execution/types";

export function emptyMissionExecution(
  missionId: string,
  nowIso = new Date().toISOString(),
): Omit<MissionExecutionRecord, "id"> & { id: string } {
  return {
    id: "",
    missionId,
    executionStatus: "NOT_STARTED",
    arrivedAt: null,
    startedAt: null,
    endedAt: null,
    arrivalNote: null,
    liveObservations: [],
    peopleContacts: [],
    organizationContacts: [],
    commitments: [],
    immediateFollowUps: [],
    fieldNotes: null,
    arrivedByUserId: null,
    startedByUserId: null,
    completedByUserId: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
