import "server-only";

import type { Prisma } from "@prisma/client";
import type { MissionDebriefRecord } from "@/lib/missions/v21/debrief/types";
import { prisma } from "@/server/db/prisma";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type DebriefRow = {
  id: string;
  missionId: string;
  debriefStatus: MissionDebriefRecord["debriefStatus"];
  outcomeAssessment: MissionDebriefRecord["outcomeAssessment"];
  outcomeSummary: string | null;
  criterionAssessments: unknown;
  peopleOutcomes: unknown;
  organizationOutcomes: unknown;
  commitmentReviews: unknown;
  followUpReviews: unknown;
  whatWorked: unknown;
  whatDidNotWork: unknown;
  lessonsLearned: unknown;
  strategicInsights: unknown;
  unresolvedQuestions: unknown;
  recommendedNextSteps: unknown;
  internalNotes: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  approvedAt: Date | null;
  startedByUserId: string | null;
  completedByUserId: string | null;
  approvedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function debriefFromRow(row: DebriefRow): MissionDebriefRecord {
  return {
    id: row.id,
    missionId: row.missionId,
    debriefStatus: row.debriefStatus,
    outcomeAssessment: row.outcomeAssessment,
    outcomeSummary: row.outcomeSummary,
    criterionAssessments:
      (row.criterionAssessments ??
        []) as MissionDebriefRecord["criterionAssessments"],
    peopleOutcomes:
      (row.peopleOutcomes ?? []) as MissionDebriefRecord["peopleOutcomes"],
    organizationOutcomes:
      (row.organizationOutcomes ??
        []) as MissionDebriefRecord["organizationOutcomes"],
    commitmentReviews:
      (row.commitmentReviews ??
        []) as MissionDebriefRecord["commitmentReviews"],
    followUpReviews:
      (row.followUpReviews ?? []) as MissionDebriefRecord["followUpReviews"],
    whatWorked: (row.whatWorked ?? []) as MissionDebriefRecord["whatWorked"],
    whatDidNotWork:
      (row.whatDidNotWork ?? []) as MissionDebriefRecord["whatDidNotWork"],
    lessonsLearned:
      (row.lessonsLearned ?? []) as MissionDebriefRecord["lessonsLearned"],
    strategicInsights:
      (row.strategicInsights ??
        []) as MissionDebriefRecord["strategicInsights"],
    unresolvedQuestions:
      (row.unresolvedQuestions ??
        []) as MissionDebriefRecord["unresolvedQuestions"],
    recommendedNextSteps:
      (row.recommendedNextSteps ??
        []) as MissionDebriefRecord["recommendedNextSteps"],
    internalNotes: row.internalNotes,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    startedByUserId: row.startedByUserId,
    completedByUserId: row.completedByUserId,
    approvedByUserId: row.approvedByUserId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getDebriefByMissionId(missionId: string) {
  return prisma.missionDebrief.findUnique({ where: { missionId } });
}

export async function getDebriefStatusByMissionId(missionId: string) {
  const row = await prisma.missionDebrief.findUnique({
    where: { missionId },
    select: { debriefStatus: true },
  });
  return row?.debriefStatus ?? null;
}

export async function countMissionDebriefs() {
  return prisma.missionDebrief.count();
}

export async function createEmptyDebrief(input: {
  missionId: string;
  createdByUserId: string | null;
}): Promise<MissionDebriefRecord> {
  const row = await prisma.missionDebrief.create({
    data: {
      missionId: input.missionId,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
      criterionAssessments: [],
      peopleOutcomes: [],
      organizationOutcomes: [],
      commitmentReviews: [],
      followUpReviews: [],
      whatWorked: [],
      whatDidNotWork: [],
      lessonsLearned: [],
      strategicInsights: [],
      unresolvedQuestions: [],
      recommendedNextSteps: [],
    },
  });
  return debriefFromRow(row);
}

export async function saveDebriefRecord(
  record: MissionDebriefRecord,
): Promise<MissionDebriefRecord> {
  const row = await prisma.missionDebrief.update({
    where: { id: record.id },
    data: {
      debriefStatus: record.debriefStatus,
      outcomeAssessment: record.outcomeAssessment,
      outcomeSummary: record.outcomeSummary,
      criterionAssessments: toJson(record.criterionAssessments),
      peopleOutcomes: toJson(record.peopleOutcomes),
      organizationOutcomes: toJson(record.organizationOutcomes),
      commitmentReviews: toJson(record.commitmentReviews),
      followUpReviews: toJson(record.followUpReviews),
      whatWorked: toJson(record.whatWorked),
      whatDidNotWork: toJson(record.whatDidNotWork),
      lessonsLearned: toJson(record.lessonsLearned),
      strategicInsights: toJson(record.strategicInsights),
      unresolvedQuestions: toJson(record.unresolvedQuestions),
      recommendedNextSteps: toJson(record.recommendedNextSteps),
      internalNotes: record.internalNotes,
      startedAt: record.startedAt ? new Date(record.startedAt) : null,
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
      approvedAt: record.approvedAt ? new Date(record.approvedAt) : null,
      startedByUserId: record.startedByUserId,
      completedByUserId: record.completedByUserId,
      approvedByUserId: record.approvedByUserId,
      updatedByUserId: record.updatedByUserId,
    },
  });
  return debriefFromRow(row);
}
