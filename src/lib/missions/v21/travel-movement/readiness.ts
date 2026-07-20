import type { TravelMovementConfig } from "@/lib/missions/v21/travel-movement/travel-config";
import {
  dispositionClearsForReadiness,
  labelFindingSeverity,
} from "@/lib/missions/v21/travel-movement/labels";
import type {
  MissionTravelAcknowledgementPersisted,
  MissionTravelPlanPersisted,
  MissionTravelReadiness,
  TravelFinding,
  TravelMissionContext,
} from "@/lib/missions/v21/travel-movement/types";

export function scheduleFingerprint(startsAt: string, endsAt: string): string {
  return `${startsAt}|${endsAt}`;
}

export function issueKey(
  issueType: string,
  scopeId: string,
): string {
  return `${issueType}:${scopeId}`;
}

function ackFor(
  acknowledgements: MissionTravelAcknowledgementPersisted[],
  key: string,
) {
  return acknowledgements.find((a) => a.issueKey === key) ?? null;
}

function movementIsRequired(
  ctx: TravelMissionContext,
  plan: MissionTravelPlanPersisted | null,
): boolean {
  if (plan?.movementRequired === false) return false;
  if (plan?.movementRequired === true) return true;
  return ctx.eventTravelRequired;
}

function destinationOf(plan: MissionTravelPlanPersisted | null, ctx: TravelMissionContext) {
  const firstLeg = plan?.legs
    .filter((l) => l.status !== "CANCELLED" && l.status !== "SKIPPED")
    .sort((a, b) => a.sequence - b.sequence)[0];
  return (
    firstLeg?.destinationLabel?.trim() ||
    ctx.locationLabel?.trim() ||
    null
  );
}

export function evaluateTravelFindings(input: {
  context: TravelMissionContext;
  plan: MissionTravelPlanPersisted | null;
  config: TravelMovementConfig;
  overlappingMissionIds?: string[];
}): TravelFinding[] {
  const { context: ctx, plan, config } = input;
  const acks = plan?.acknowledgements ?? [];
  const findings: TravelFinding[] = [];
  const required = movementIsRequired(ctx, plan);

  const push = (
    finding: Omit<TravelFinding, "disposition" | "clearsForReadiness" | "severityLabel"> & {
      severity: TravelFinding["severity"];
    },
  ) => {
    const ack = ackFor(acks, finding.issueKey);
    findings.push({
      ...finding,
      severityLabel: labelFindingSeverity(finding.severity),
      disposition: ack?.disposition ?? null,
      clearsForReadiness: dispositionClearsForReadiness(ack?.disposition),
    });
  };

  if (ctx.isCancelled && plan && plan.status !== "CANCELLED" && plan.status !== "INACTIVE") {
    push({
      issueKey: issueKey("CANCELLED_MISSION_ACTIVE_PLAN", ctx.missionId),
      issueType: "CANCELLED_MISSION_ACTIVE_PLAN",
      title: "Active travel plan on cancelled Mission",
      explanation:
        "The Mission is cancelled, but the travel plan remains active. Deactivate or cancel the plan deliberately.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (!required) {
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  if (!plan || plan.status === "INACTIVE" || plan.status === "CANCELLED") {
    push({
      issueKey: issueKey("NO_PLAN", ctx.missionId),
      issueType: "NO_PLAN",
      title: "Movement required but no travel plan",
      explanation:
        "Stored Mission/Event data indicates travel is required, and no active Mission travel plan exists.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  if (!plan.plannedDepartureAt) {
    push({
      issueKey: issueKey("MISSING_DEPARTURE", plan.id),
      issueType: "MISSING_DEPARTURE",
      title: "Departure time not set",
      explanation: "Movement is required and no planned departure time is stored.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
  }

  if (config.requireDestinationWhenMovementRequired && !destinationOf(plan, ctx)) {
    push({
      issueKey: issueKey("MISSING_DESTINATION", plan.id),
      issueType: "MISSING_DESTINATION",
      title: "Destination not identified",
      explanation:
        "Movement is required and neither a leg destination nor Mission location label is stored.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
  }

  if (plan.driverRequired && !plan.driverName?.trim() && !plan.driverUserId) {
    push({
      issueKey: issueKey("MISSING_DRIVER", plan.id),
      issueType: "MISSING_DRIVER",
      title: "Driver required but unassigned",
      explanation: "This plan explicitly requires a driver and none is stored.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
  }

  if (plan.vehicleRequired && !plan.vehicleDescription?.trim()) {
    push({
      issueKey: issueKey("MISSING_VEHICLE", plan.id),
      issueType: "MISSING_VEHICLE",
      title: "Vehicle required but unassigned",
      explanation: "This plan explicitly requires a vehicle and none is stored.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
  }

  if (plan.requiredArrivalAt) {
    const arrivalMs = new Date(plan.requiredArrivalAt).getTime();
    const startMs = new Date(ctx.startsAt).getTime();
    if (Number.isFinite(arrivalMs) && Number.isFinite(startMs) && arrivalMs > startMs) {
      push({
        issueKey: issueKey("ARRIVAL_AFTER_MISSION_START", plan.id),
        issueType: "ARRIVAL_AFTER_MISSION_START",
        title: "Required arrival is after Mission start",
        explanation:
          "Stored required arrival is later than the Mission start time.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
      });
    }
  }

  if (plan.plannedDepartureAt) {
    const depMs = new Date(plan.plannedDepartureAt).getTime();
    const startMs = new Date(ctx.startsAt).getTime();
    if (Number.isFinite(depMs) && Number.isFinite(startMs) && depMs > startMs) {
      push({
        issueKey: issueKey("TIME_CONFLICT", `${plan.id}:departure-after-start`),
        issueType: "TIME_CONFLICT",
        title: "Departure after Mission start",
        explanation:
          "Stored planned departure is after the Mission start time.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
      });
    }
  }

  const activeLegs = [...plan.legs]
    .filter((l) => l.status !== "CANCELLED" && l.status !== "SKIPPED")
    .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));

  for (let i = 0; i < activeLegs.length; i++) {
    const leg = activeLegs[i];
    if (!leg.originLabel?.trim() || !leg.destinationLabel?.trim()) {
      push({
        issueKey: issueKey("LEG_INCOMPLETE", leg.id),
        issueType: "LEG_INCOMPLETE",
        title: `Leg ${leg.sequence} is incomplete`,
        explanation: "An active leg is missing origin or destination label.",
        severity: "WARNING",
        missionId: ctx.missionId,
      });
    }
    if (
      leg.plannedDepartureAt &&
      leg.plannedArrivalAt &&
      new Date(leg.plannedArrivalAt).getTime() <
        new Date(leg.plannedDepartureAt).getTime()
    ) {
      push({
        issueKey: issueKey("TIME_CONFLICT", leg.id),
        issueType: "TIME_CONFLICT",
        title: `Leg ${leg.sequence} arrival before departure`,
        explanation: "Stored leg arrival is before stored leg departure.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
      });
    }
    if (i > 0) {
      const prev = activeLegs[i - 1];
      if (leg.sequence <= prev.sequence) {
        push({
          issueKey: issueKey("LEG_ORDER", plan.id),
          issueType: "LEG_ORDER",
          title: "Leg sequence is not strictly increasing",
          explanation: "Active legs are not in a stable ascending sequence.",
          severity: "WARNING",
          missionId: ctx.missionId,
        });
      }
    }
  }

  if (
    config.minBufferMinutesWhenRequired != null &&
    (plan.bufferMinutes == null ||
      plan.bufferMinutes < config.minBufferMinutesWhenRequired)
  ) {
    push({
      issueKey: issueKey("MISSING_BUFFER", plan.id),
      issueType: "MISSING_BUFFER",
      title: "Travel buffer below campaign threshold",
      explanation: `Campaign policy expects at least ${config.minBufferMinutesWhenRequired} minutes of buffer.`,
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  } else if (plan.bufferMinutes == null && required) {
    push({
      issueKey: issueKey("MISSING_BUFFER", `${plan.id}:info`),
      issueType: "MISSING_BUFFER",
      title: "No travel buffer stored",
      explanation: "Buffer minutes are optional; none are stored on this plan.",
      severity: "INFO",
      missionId: ctx.missionId,
    });
  }

  const expectedFp = scheduleFingerprint(ctx.startsAt, ctx.endsAt);
  if (plan.scheduleFingerprint && plan.scheduleFingerprint !== expectedFp) {
    push({
      issueKey: issueKey("STALE_AFTER_RESCHEDULE", plan.id),
      issueType: "STALE_AFTER_RESCHEDULE",
      title: "Plan not reconfirmed after Mission schedule change",
      explanation:
        "Mission start/end changed after the travel plan was last confirmed.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  const startKey = ctx.startsAt.slice(0, 10);
  const endKey = ctx.endsAt.slice(0, 10);
  if (startKey !== endKey && ctx.campaignDateKey !== startKey && ctx.campaignDateKey !== endKey) {
    push({
      issueKey: issueKey("CROSS_MIDNIGHT_AMBIGUITY", plan.id),
      issueType: "CROSS_MIDNIGHT_AMBIGUITY",
      title: "Cross-midnight campaign-day association is ambiguous",
      explanation:
        "Mission spans midnight and campaignDateKey does not match start or end UTC date keys. Operator should confirm association.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (
    plan.plannedDepartureAt &&
    ctx.preparationExists === false &&
    required
  ) {
    push({
      issueKey: issueKey("PREP_INCOMPLETE", ctx.missionId),
      issueType: "PREP_INCOMPLETE",
      title: "No Prepare record while travel is planned",
      explanation:
        "A departure is stored but Prepare Mode has no record yet. Travel does not create preparation.",
      severity: "INFO",
      missionId: ctx.missionId,
    });
  }

  for (const otherId of input.overlappingMissionIds ?? []) {
    push({
      issueKey: issueKey("MOVEMENT_OVERLAP", `${ctx.missionId}:${otherId}`),
      issueType: "MOVEMENT_OVERLAP",
      title: "Movement window overlaps another Mission",
      explanation:
        "Stored departure-to-arrival windows overlap another Mission on this campaign day.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
}

export function deriveTravelReadiness(input: {
  context: TravelMissionContext;
  plan: MissionTravelPlanPersisted | null;
  findings: TravelFinding[];
}): MissionTravelReadiness {
  const required = movementIsRequired(input.context, input.plan);
  if (!required) return "NOT_REQUIRED";
  if (!input.plan || input.plan.status === "INACTIVE" || input.plan.status === "CANCELLED") {
    return "NOT_READY";
  }

  const openBlockers = input.findings.filter(
    (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
  );
  const acceptedBlockers = input.findings.filter(
    (f) =>
      f.severity === "BLOCKER" &&
      f.disposition === "ACCEPTED_RISK",
  );
  const allBlockers = input.findings.filter((f) => f.severity === "BLOCKER");

  if (openBlockers.length > 0) return "NOT_READY";
  if (
    acceptedBlockers.length > 0 &&
    acceptedBlockers.length === allBlockers.length
  ) {
    return "READY_WITH_ACCEPTED_RISK";
  }
  if (allBlockers.length === 0 || allBlockers.every((f) => f.clearsForReadiness)) {
    return "READY";
  }
  return "NOT_READY";
}

export function detectMovementOverlaps(
  missions: Array<{
    missionId: string;
    departureAt: string | null;
    arrivalAt: string | null;
    startsAt: string;
  }>,
): Map<string, string[]> {
  const windows = missions
    .map((m) => {
      const start = m.departureAt ?? m.startsAt;
      const end = m.arrivalAt ?? m.startsAt;
      return {
        missionId: m.missionId,
        startMs: new Date(start).getTime(),
        endMs: new Date(end).getTime(),
      };
    })
    .filter((w) => Number.isFinite(w.startMs) && Number.isFinite(w.endMs));

  const map = new Map<string, string[]>();
  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 1; j < windows.length; j++) {
      const a = windows[i];
      const b = windows[j];
      if (a.startMs < b.endMs && b.startMs < a.endMs) {
        const listA = map.get(a.missionId) ?? [];
        listA.push(b.missionId);
        map.set(a.missionId, listA);
        const listB = map.get(b.missionId) ?? [];
        listB.push(a.missionId);
        map.set(b.missionId, listB);
      }
    }
  }
  return map;
}
