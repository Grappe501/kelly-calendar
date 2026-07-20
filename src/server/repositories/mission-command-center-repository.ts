import "server-only";

import type { CommandCenterMissionSnapshot } from "@/lib/missions/v21/command-center/types";
import type { MissionDebriefStatus, MissionOutcomeAssessment } from "@/lib/missions/v21/debrief/types";
import type { MissionExecutionStatus } from "@/lib/missions/v21/execution/types";
import type {
  MissionFollowUpActionStatus,
  MissionFollowUpPriority,
  MissionFollowUpSourceType,
  MissionFollowUpStatus,
} from "@/lib/missions/v21/follow-up/types";
import type { PreparationReadinessState } from "@/lib/missions/v21/preparation/types";
import type {
  MissionLifecyclePhase,
  MissionOperationalStatus,
} from "@/lib/missions/v21/types";
import { projectLifecyclePhase } from "@/lib/missions/v21";
import { prisma } from "@/server/db/prisma";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function countApprovedFollowUps(debrief: {
  commitmentReviews: unknown;
  followUpReviews: unknown;
  unresolvedQuestions: unknown;
  lessonsLearned: unknown;
  recommendedNextSteps: unknown;
} | null): number {
  if (!debrief) return 0;
  let n = 0;
  for (const key of [
    "commitmentReviews",
    "followUpReviews",
    "unresolvedQuestions",
    "lessonsLearned",
    "recommendedNextSteps",
  ] as const) {
    for (const row of asArray(debrief[key])) {
      if (
        row &&
        typeof row === "object" &&
        "approvedForFollowUp" in row &&
        Boolean((row as { approvedForFollowUp?: unknown }).approvedForFollowUp)
      ) {
        n += 1;
      }
    }
  }
  return n;
}

function locationFromIntelligence(intelligence: unknown): string | null {
  if (!intelligence || typeof intelligence !== "object") return null;
  const intel = intelligence as {
    venueName?: string | null;
    city?: string | null;
    county?: string | null;
  };
  const parts = [
    intel.venueName,
    intel.city,
    intel.county ? `${intel.county} County` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Bounded load of Mission candidates with phase records for Command Center.
 * Single query + includes — no per-Mission N+1.
 */
export async function listMissionsForCommandCenter(options: {
  now: Date;
  upcomingWindowDays: number;
  recentlyClosedWindowDays: number;
  lookbackDays?: number;
  limit?: number;
}): Promise<CommandCenterMissionSnapshot[]> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 400);
  const lookbackDays = options.lookbackDays ?? 90;
  const now = options.now;
  const upcomingEnd = new Date(
    now.getTime() + options.upcomingWindowDays * 86_400_000,
  );
  const lookbackStart = new Date(now.getTime() - lookbackDays * 86_400_000);
  const recentlyClosedStart = new Date(
    now.getTime() - options.recentlyClosedWindowDays * 86_400_000,
  );

  const rows = await prisma.campaignMission.findMany({
    where: {
      sourceEvent: { archivedAt: null },
      OR: [
        {
          startsAt: {
            gte: lookbackStart,
            lte: upcomingEnd,
          },
        },
        {
          execution: {
            executionStatus: { in: ["ARRIVED", "IN_PROGRESS", "COMPLETED"] },
          },
        },
        {
          debrief: {
            debriefStatus: {
              in: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "APPROVED"],
            },
          },
        },
        {
          followUp: {
            OR: [
              { followUpStatus: { in: ["ACTIVE", "READY_TO_CLOSE"] } },
              { closedAt: { gte: recentlyClosedStart } },
              {
                actions: {
                  some: {
                    status: {
                      in: ["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"],
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
    take: limit,
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      attendTitle: true,
      objective: true,
      missionStatus: true,
      lifecyclePhase: true,
      intelligence: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      sourceEvent: {
        select: {
          status: true,
          archivedAt: true,
          travelPlans: { select: { travelRequired: true } },
          outcomes: { select: { id: true }, take: 1 },
          followups: { select: { id: true } },
        },
      },
      preparation: {
        select: {
          readinessState: true,
          strategicPurpose: true,
          keyMessage: true,
        },
      },
      execution: {
        select: {
          executionStatus: true,
          arrivedAt: true,
          startedAt: true,
          endedAt: true,
          liveObservations: true,
          commitments: true,
          immediateFollowUps: true,
        },
      },
      debrief: {
        select: {
          debriefStatus: true,
          outcomeAssessment: true,
          completedAt: true,
          approvedAt: true,
          commitmentReviews: true,
          followUpReviews: true,
          unresolvedQuestions: true,
          lessonsLearned: true,
          recommendedNextSteps: true,
        },
      },
      followUp: {
        select: {
          followUpStatus: true,
          completedAt: true,
          closedAt: true,
          closedByUserId: true,
          closeoutSummary: true,
          actions: {
            where: {
              status: {
                in: [
                  "OPEN",
                  "IN_PROGRESS",
                  "WAITING",
                  "BLOCKED",
                  "COMPLETED",
                  "CANCELLED",
                ],
              },
            },
            select: {
              id: true,
              title: true,
              sourceType: true,
              status: true,
              priority: true,
              ownerType: true,
              ownerName: true,
              dueAt: true,
              nextCheckAt: true,
              waitingReason: true,
              blockedReason: true,
              relatedPersonName: true,
              relatedOrganizationName: true,
              sourceSnapshot: true,
            },
            // Bound unresolved + recent closed actions per mission
            take: 80,
            orderBy: [{ dueAt: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  return rows.map((row): CommandCenterMissionSnapshot => {
    const travelRequired = row.sourceEvent.travelPlans.some((t) => t.travelRequired);
    const lifecyclePhase = projectLifecyclePhase({
      eventStatus: row.sourceEvent.status,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      travelRequired,
      hasOutcome: row.sourceEvent.outcomes.length > 0,
      followupCount: row.sourceEvent.followups.length,
      now,
    });

    return {
      missionId: row.id,
      title: row.attendTitle,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      timezone: row.timezone,
      locationLabel: locationFromIntelligence(row.intelligence),
      lifecyclePhase: lifecyclePhase as MissionLifecyclePhase,
      operationalStatus: row.missionStatus as MissionOperationalStatus,
      travelRequired,
      objective: row.objective,
      preparation: {
        exists: Boolean(row.preparation),
        readiness: (row.preparation?.readinessState ??
          null) as PreparationReadinessState | null,
        strategicPurpose: row.preparation?.strategicPurpose ?? null,
        keyMessage: row.preparation?.keyMessage ?? null,
      },
      execution: {
        exists: Boolean(row.execution),
        status: (row.execution?.executionStatus ??
          null) as MissionExecutionStatus | null,
        arrivedAt: row.execution?.arrivedAt?.toISOString() ?? null,
        startedAt: row.execution?.startedAt?.toISOString() ?? null,
        endedAt: row.execution?.endedAt?.toISOString() ?? null,
        observationCount: asArray(row.execution?.liveObservations).length,
        commitmentCount: asArray(row.execution?.commitments).length,
        followUpCount: asArray(row.execution?.immediateFollowUps).length,
      },
      debrief: {
        exists: Boolean(row.debrief),
        status: (row.debrief?.debriefStatus ?? null) as MissionDebriefStatus | null,
        outcomeAssessment: (row.debrief?.outcomeAssessment ??
          null) as MissionOutcomeAssessment | null,
        approvedFollowUpCount: countApprovedFollowUps(row.debrief),
        completedAt: row.debrief?.completedAt?.toISOString() ?? null,
        approvedAt: row.debrief?.approvedAt?.toISOString() ?? null,
      },
      followUp: {
        exists: Boolean(row.followUp),
        status: (row.followUp?.followUpStatus ??
          null) as MissionFollowUpStatus | null,
        completedAt: row.followUp?.completedAt?.toISOString() ?? null,
        closedAt: row.followUp?.closedAt?.toISOString() ?? null,
        closedByUserId: row.followUp?.closedByUserId ?? null,
        closeoutSummary: row.followUp?.closeoutSummary ?? null,
        actions: (row.followUp?.actions ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          sourceType: a.sourceType as MissionFollowUpSourceType,
          status: a.status as MissionFollowUpActionStatus,
          priority: a.priority as MissionFollowUpPriority,
          ownerType: a.ownerType,
          ownerName: a.ownerName,
          dueAt: a.dueAt?.toISOString() ?? null,
          nextCheckAt: a.nextCheckAt?.toISOString() ?? null,
          waitingReason: a.waitingReason,
          blockedReason: a.blockedReason,
          relatedPersonName: a.relatedPersonName,
          relatedOrganizationName: a.relatedOrganizationName,
          sourceSnapshot:
            a.sourceSnapshot && typeof a.sourceSnapshot === "object"
              ? (a.sourceSnapshot as Record<string, unknown>)
              : null,
        })),
      },
    };
  });
}

/** Diagnostic counts — read-only, no writes. */
export async function countCommandCenterDiagnostics() {
  const [
    totalMissions,
    preparationCount,
    executionCount,
    debriefCount,
    followUpCount,
    actionCount,
  ] = await Promise.all([
    prisma.campaignMission.count(),
    prisma.missionPreparation.count(),
    prisma.missionExecution.count(),
    prisma.missionDebrief.count(),
    prisma.missionFollowUp.count(),
    prisma.missionFollowUpAction.count(),
  ]);
  return {
    totalMissions,
    preparationCount,
    executionCount,
    debriefCount,
    followUpCount,
    actionCount,
    commandCenterPersistedRows: 0,
  };
}
