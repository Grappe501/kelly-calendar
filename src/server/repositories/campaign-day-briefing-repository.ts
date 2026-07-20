import "server-only";

import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
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

function asStringList(value: unknown): string[] {
  return asArray(value)
    .map((row) => {
      if (typeof row === "string") return row;
      if (row && typeof row === "object" && "text" in row) {
        const t = (row as { text?: unknown }).text;
        return typeof t === "string" ? t : null;
      }
      if (row && typeof row === "object" && "label" in row) {
        const t = (row as { label?: unknown }).label;
        return typeof t === "string" ? t : null;
      }
      return null;
    })
    .filter((s): s is string => Boolean(s));
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

function mapRow(row: {
  id: string;
  attendTitle: string;
  objective: string | null;
  successCriteria: unknown;
  missionStatus: MissionOperationalStatus;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  intelligence: unknown;
  sourceEvent: {
    status: string;
    isAllDay: boolean;
    departureAt: Date | null;
    arrivalAt: Date | null;
    travelPlans: Array<{
      travelRequired: boolean;
      departureAt: Date | null;
      targetArrivalAt: Date | null;
      estimatedDurationMinutes: number | null;
      parkingInstructions: string | null;
    }>;
    outcomes: Array<{ id: string }>;
    followups: Array<{ id: string }>;
  };
  preparation: {
    readinessState: PreparationReadinessState;
    strategicPurpose: string | null;
    keyMessage: string | null;
    desiredImpression: string | null;
    openingApproach: string | null;
    closingApproach: string | null;
    questionsToAsk: unknown;
    commitmentsToAvoid: unknown;
    sensitivities: unknown;
    peopleBriefings: unknown;
    organizationBriefings: unknown;
    arrivalInstructions: string | null;
    parkingInstructions: string | null;
    accessibilityNotes: string | null;
    travelNotes: string | null;
    materialsNeeded: unknown;
    preparationTasks: unknown;
  } | null;
  execution: {
    executionStatus: MissionExecutionStatus;
    arrivedAt: Date | null;
    startedAt: Date | null;
    endedAt: Date | null;
  } | null;
  debrief: {
    debriefStatus: MissionDebriefStatus;
    outcomeAssessment: MissionOutcomeAssessment;
    completedAt: Date | null;
    approvedAt: Date | null;
  } | null;
  followUp: {
    followUpStatus: MissionFollowUpStatus;
    closedAt: Date | null;
    actions: Array<{
      id: string;
      title: string;
      sourceType: MissionFollowUpSourceType;
      status: MissionFollowUpActionStatus;
      priority: MissionFollowUpPriority;
      ownerType: string;
      ownerName: string | null;
      dueAt: Date | null;
      nextCheckAt: Date | null;
      blockedReason: string | null;
      relatedPersonName: string | null;
      relatedOrganizationName: string | null;
    }>;
  } | null;
  travelPlan: {
    status: string;
    plannedDepartureAt: Date | null;
    requiredArrivalAt: Date | null;
    bufferMinutes: number | null;
    movementRequired: boolean | null;
  } | null;
}, now: Date): DayBriefingMissionSnapshot {
  const travelRequired = row.sourceEvent.travelPlans.some((t) => t.travelRequired);
  const plan = row.sourceEvent.travelPlans[0] ?? null;
  const lifecyclePhase = projectLifecyclePhase({
    eventStatus: row.sourceEvent.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    travelRequired,
    hasOutcome: row.sourceEvent.outcomes.length > 0,
    followupCount: row.sourceEvent.followups.length,
    now,
  });

  const people = asArray(row.preparation?.peopleBriefings).map((raw, i) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    return {
      id: typeof p.id === "string" ? p.id : `person_${i}`,
      name: typeof p.name === "string" ? p.name : "Unnamed",
      roleOrTitle: typeof p.roleOrTitle === "string" ? p.roleOrTitle : null,
      organization: typeof p.organization === "string" ? p.organization : null,
      whyTheyMatter: typeof p.whyTheyMatter === "string" ? p.whyTheyMatter : null,
      conversationGoal:
        typeof p.conversationGoal === "string" ? p.conversationGoal : null,
      linkedPersonId:
        typeof p.linkedPersonId === "string" ? p.linkedPersonId : null,
    };
  });

  const orgs = asArray(row.preparation?.organizationBriefings).map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    return {
      id: typeof o.id === "string" ? o.id : `org_${i}`,
      name: typeof o.name === "string" ? o.name : "Unnamed organization",
      relationshipToMission:
        typeof o.relationshipToMission === "string"
          ? o.relationshipToMission
          : null,
      desiredOutcome:
        typeof o.desiredOutcome === "string" ? o.desiredOutcome : null,
    };
  });

  const tasks = asArray(row.preparation?.preparationTasks).map((raw, i) => {
    const t = (raw ?? {}) as Record<string, unknown>;
    return {
      id: typeof t.id === "string" ? t.id : `task_${i}`,
      label: typeof t.label === "string" ? t.label : "Task",
      owner: typeof t.owner === "string" ? t.owner : null,
      dueAt:
        typeof t.dueAt === "string"
          ? t.dueAt
          : t.dueAt instanceof Date
            ? t.dueAt.toISOString()
            : null,
      completed: Boolean(t.completed),
    };
  });

  return {
    missionId: row.id,
    title: row.attendTitle,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: row.timezone,
    locationLabel: locationFromIntelligence(row.intelligence),
    isAllDay: row.sourceEvent.isAllDay,
    lifecyclePhase: lifecyclePhase as MissionLifecyclePhase,
    operationalStatus: row.missionStatus,
    travelRequired,
    objective: row.objective,
    successCriteria: Array.isArray(row.successCriteria)
      ? (row.successCriteria as string[]).filter((s) => typeof s === "string")
      : [],
    eventDepartureAt: row.sourceEvent.departureAt?.toISOString() ?? null,
    eventArrivalAt: row.sourceEvent.arrivalAt?.toISOString() ?? null,
    travelPlan: plan
      ? {
          departureAt: plan.departureAt?.toISOString() ?? null,
          targetArrivalAt: plan.targetArrivalAt?.toISOString() ?? null,
          estimatedDurationMinutes: plan.estimatedDurationMinutes,
          parkingInstructions: plan.parkingInstructions,
        }
      : null,
    missionTravelPlan: row.travelPlan
      ? {
          exists: true,
          status: row.travelPlan.status,
          plannedDepartureAt:
            row.travelPlan.plannedDepartureAt?.toISOString() ?? null,
          requiredArrivalAt:
            row.travelPlan.requiredArrivalAt?.toISOString() ?? null,
          bufferMinutes: row.travelPlan.bufferMinutes,
          movementRequired: row.travelPlan.movementRequired,
        }
      : null,
    preparation: {
      exists: Boolean(row.preparation),
      readiness: row.preparation?.readinessState ?? null,
      strategicPurpose: row.preparation?.strategicPurpose ?? null,
      keyMessage: row.preparation?.keyMessage ?? null,
      desiredImpression: row.preparation?.desiredImpression ?? null,
      openingApproach: row.preparation?.openingApproach ?? null,
      closingApproach: row.preparation?.closingApproach ?? null,
      questionsToAsk: asStringList(row.preparation?.questionsToAsk),
      commitmentsToAvoid: asStringList(row.preparation?.commitmentsToAvoid),
      sensitivities: asStringList(row.preparation?.sensitivities),
      peopleBriefings: people,
      organizationBriefings: orgs,
      arrivalInstructions: row.preparation?.arrivalInstructions ?? null,
      parkingInstructions: row.preparation?.parkingInstructions ?? null,
      accessibilityNotes: row.preparation?.accessibilityNotes ?? null,
      travelNotes: row.preparation?.travelNotes ?? null,
      materialsNeeded: asStringList(row.preparation?.materialsNeeded),
      preparationTasks: tasks,
    },
    execution: {
      exists: Boolean(row.execution),
      status: row.execution?.executionStatus ?? null,
      arrivedAt: row.execution?.arrivedAt?.toISOString() ?? null,
      startedAt: row.execution?.startedAt?.toISOString() ?? null,
      endedAt: row.execution?.endedAt?.toISOString() ?? null,
    },
    debrief: {
      exists: Boolean(row.debrief),
      status: row.debrief?.debriefStatus ?? null,
      outcomeAssessment: row.debrief?.outcomeAssessment ?? null,
      completedAt: row.debrief?.completedAt?.toISOString() ?? null,
      approvedAt: row.debrief?.approvedAt?.toISOString() ?? null,
    },
    followUp: {
      exists: Boolean(row.followUp),
      status: row.followUp?.followUpStatus ?? null,
      closedAt: row.followUp?.closedAt?.toISOString() ?? null,
      actions: (row.followUp?.actions ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        sourceType: a.sourceType,
        status: a.status,
        priority: a.priority,
        ownerType: a.ownerType,
        ownerName: a.ownerName,
        dueAt: a.dueAt?.toISOString() ?? null,
        nextCheckAt: a.nextCheckAt?.toISOString() ?? null,
        blockedReason: a.blockedReason,
        relatedPersonName: a.relatedPersonName,
        relatedOrganizationName: a.relatedOrganizationName,
      })),
    },
  };
}

/**
 * Load Missions whose schedule intersects [rangeStart, rangeEnd], plus
 * Missions with unresolved Follow-up / Debrief work (operational pool).
 * Single findMany — no per-Mission N+1.
 */
export async function loadMissionsForDayBriefing(options: {
  rangeStart: Date;
  rangeEnd: Date;
  operationalLookbackStart: Date;
  now: Date;
  limit?: number;
}): Promise<DayBriefingMissionSnapshot[]> {
  const limit = Math.min(Math.max(options.limit ?? 150, 1), 300);
  const openStatuses: MissionFollowUpActionStatus[] = [
    "OPEN",
    "IN_PROGRESS",
    "WAITING",
    "BLOCKED",
  ];
  const rows = await prisma.campaignMission.findMany({
    where: {
      sourceEvent: { archivedAt: null },
      OR: [
        {
          startsAt: { lte: options.rangeEnd },
          endsAt: { gte: options.rangeStart },
        },
        {
          startsAt: {
            gte: options.operationalLookbackStart,
            lte: options.rangeEnd,
          },
        },
        {
          followUp: {
            OR: [
              { followUpStatus: { in: ["ACTIVE", "READY_TO_CLOSE"] } },
              {
                actions: {
                  some: {
                    status: { in: openStatuses },
                  },
                },
              },
            ],
          },
        },
        {
          debrief: {
            debriefStatus: { in: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] },
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
      successCriteria: true,
      missionStatus: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      intelligence: true,
      sourceEvent: {
        select: {
          status: true,
          isAllDay: true,
          departureAt: true,
          arrivalAt: true,
          travelPlans: {
            select: {
              travelRequired: true,
              departureAt: true,
              targetArrivalAt: true,
              estimatedDurationMinutes: true,
              parkingInstructions: true,
            },
            take: 1,
          },
          outcomes: { select: { id: true }, take: 1 },
          followups: { select: { id: true } },
        },
      },
      preparation: {
        select: {
          readinessState: true,
          strategicPurpose: true,
          keyMessage: true,
          desiredImpression: true,
          openingApproach: true,
          closingApproach: true,
          questionsToAsk: true,
          commitmentsToAvoid: true,
          sensitivities: true,
          peopleBriefings: true,
          organizationBriefings: true,
          arrivalInstructions: true,
          parkingInstructions: true,
          accessibilityNotes: true,
          travelNotes: true,
          materialsNeeded: true,
          preparationTasks: true,
        },
      },
      execution: {
        select: {
          executionStatus: true,
          arrivedAt: true,
          startedAt: true,
          endedAt: true,
        },
      },
      debrief: {
        select: {
          debriefStatus: true,
          outcomeAssessment: true,
          completedAt: true,
          approvedAt: true,
        },
      },
      followUp: {
        select: {
          followUpStatus: true,
          closedAt: true,
          actions: {
            where: { status: { in: openStatuses } },
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
              blockedReason: true,
              relatedPersonName: true,
              relatedOrganizationName: true,
            },
            take: 60,
            orderBy: [{ dueAt: "asc" }, { id: "asc" }],
          },
        },
      },
      travelPlan: {
        select: {
          status: true,
          plannedDepartureAt: true,
          requiredArrivalAt: true,
          bufferMinutes: true,
          movementRequired: true,
        },
      },
    },
  });

  return rows.map((row) => mapRow(row, options.now));
}
