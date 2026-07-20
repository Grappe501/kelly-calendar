import "server-only";

import type { Prisma } from "@prisma/client";
import type { MissionPreparationRecord } from "@/lib/missions/v21/preparation/types";
import { prisma } from "@/server/db/prisma";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type PrepRow = {
  id: string;
  missionId: string;
  briefingSummary: string | null;
  strategicPurpose: string | null;
  desiredImpression: string | null;
  keyMessage: string | null;
  openingApproach: string | null;
  closingApproach: string | null;
  questionsToAsk: unknown;
  talkingPoints: unknown;
  thingsToNotice: unknown;
  sensitivities: unknown;
  commitmentsToAvoid: unknown;
  storiesOrExamples: unknown;
  peopleBriefings: unknown;
  organizationBriefings: unknown;
  logisticsNotes: string | null;
  arrivalInstructions: string | null;
  parkingInstructions: string | null;
  entryContact: string | null;
  attireNotes: string | null;
  accessibilityNotes: string | null;
  travelNotes: string | null;
  lodgingNotes: string | null;
  materialsNeeded: unknown;
  preparationTasks: unknown;
  operatorNotes: string | null;
  readinessState: MissionPreparationRecord["readinessState"];
  markedReadyAt: Date | null;
  markedReadyByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function preparationFromRow(row: PrepRow): MissionPreparationRecord {
  return {
    id: row.id,
    missionId: row.missionId,
    briefingSummary: row.briefingSummary,
    strategicPurpose: row.strategicPurpose,
    desiredImpression: row.desiredImpression,
    keyMessage: row.keyMessage,
    openingApproach: row.openingApproach,
    closingApproach: row.closingApproach,
    questionsToAsk: (row.questionsToAsk ?? []) as MissionPreparationRecord["questionsToAsk"],
    talkingPoints: (row.talkingPoints ?? []) as MissionPreparationRecord["talkingPoints"],
    thingsToNotice: (row.thingsToNotice ?? []) as MissionPreparationRecord["thingsToNotice"],
    sensitivities: (row.sensitivities ?? []) as MissionPreparationRecord["sensitivities"],
    commitmentsToAvoid:
      (row.commitmentsToAvoid ?? []) as MissionPreparationRecord["commitmentsToAvoid"],
    storiesOrExamples:
      (row.storiesOrExamples ?? []) as MissionPreparationRecord["storiesOrExamples"],
    peopleBriefings:
      (row.peopleBriefings ?? []) as MissionPreparationRecord["peopleBriefings"],
    organizationBriefings:
      (row.organizationBriefings ?? []) as MissionPreparationRecord["organizationBriefings"],
    logisticsNotes: row.logisticsNotes,
    arrivalInstructions: row.arrivalInstructions,
    parkingInstructions: row.parkingInstructions,
    entryContact: row.entryContact,
    attireNotes: row.attireNotes,
    accessibilityNotes: row.accessibilityNotes,
    travelNotes: row.travelNotes,
    lodgingNotes: row.lodgingNotes,
    materialsNeeded:
      (row.materialsNeeded ?? []) as MissionPreparationRecord["materialsNeeded"],
    preparationTasks:
      (row.preparationTasks ?? []) as MissionPreparationRecord["preparationTasks"],
    operatorNotes: row.operatorNotes,
    readinessState: row.readinessState,
    markedReadyAt: row.markedReadyAt?.toISOString() ?? null,
    markedReadyByUserId: row.markedReadyByUserId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getPreparationByMissionId(missionId: string) {
  return prisma.missionPreparation.findUnique({ where: { missionId } });
}

export async function createEmptyPreparation(input: {
  missionId: string;
  createdByUserId: string | null;
}): Promise<MissionPreparationRecord> {
  const row = await prisma.missionPreparation.create({
    data: {
      missionId: input.missionId,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
      questionsToAsk: [],
      talkingPoints: [],
      thingsToNotice: [],
      sensitivities: [],
      commitmentsToAvoid: [],
      storiesOrExamples: [],
      peopleBriefings: [],
      organizationBriefings: [],
      materialsNeeded: [],
      preparationTasks: [],
    },
  });
  return preparationFromRow(row);
}

export async function savePreparationRecord(
  record: MissionPreparationRecord,
): Promise<MissionPreparationRecord> {
  const data = {
    briefingSummary: record.briefingSummary,
    strategicPurpose: record.strategicPurpose,
    desiredImpression: record.desiredImpression,
    keyMessage: record.keyMessage,
    openingApproach: record.openingApproach,
    closingApproach: record.closingApproach,
    questionsToAsk: toJson(record.questionsToAsk),
    talkingPoints: toJson(record.talkingPoints),
    thingsToNotice: toJson(record.thingsToNotice),
    sensitivities: toJson(record.sensitivities),
    commitmentsToAvoid: toJson(record.commitmentsToAvoid),
    storiesOrExamples: toJson(record.storiesOrExamples),
    peopleBriefings: toJson(record.peopleBriefings),
    organizationBriefings: toJson(record.organizationBriefings),
    logisticsNotes: record.logisticsNotes,
    arrivalInstructions: record.arrivalInstructions,
    parkingInstructions: record.parkingInstructions,
    entryContact: record.entryContact,
    attireNotes: record.attireNotes,
    accessibilityNotes: record.accessibilityNotes,
    travelNotes: record.travelNotes,
    lodgingNotes: record.lodgingNotes,
    materialsNeeded: toJson(record.materialsNeeded),
    preparationTasks: toJson(record.preparationTasks),
    operatorNotes: record.operatorNotes,
    readinessState: record.readinessState,
    markedReadyAt: record.markedReadyAt ? new Date(record.markedReadyAt) : null,
    markedReadyByUserId: record.markedReadyByUserId,
    updatedByUserId: record.updatedByUserId,
  };

  const row = await prisma.missionPreparation.update({
    where: { id: record.id },
    data,
  });
  return preparationFromRow(row);
}
