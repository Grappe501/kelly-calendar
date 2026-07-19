import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";
import { emptyLeaveByHook, type LeaveByHook } from "@/lib/missions/leave-by-contract";

export type MissionRiskLevel = "NONE" | "WATCH" | "HIGH" | "CRITICAL";

export type MissionImmediateAction = {
  label: string;
  explanation: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  href: string;
};

export type MissionCard = {
  missionId: string;
  title: string;
  whenLabel: string;
  startsAt: string;
  endsAt: string;
  whereLabel: string;
  whyItMatters: string;
  ownerLabel: string;
  readinessLevel: string;
  readinessScore: number | null;
  readinessLabel: string;
  riskLevel: MissionRiskLevel;
  riskNote: string | null;
  immediateAction: MissionImmediateAction;
  leaveBy: LeaveByHook;
  isNext: boolean;
  status: string;
};

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function whyItMatters(event: SafeEventProjection): string {
  const cal = event.primaryCalendar.type.replace(/_/g, " ").toLowerCase();
  const status = event.status.replace(/_/g, " ").toLowerCase();
  if (event.status === "CONFIRMED" || event.status === "APPROVED") {
    return `Confirmed ${cal} mission — keep the day on track.`;
  }
  if (event.status === "DRAFT" || event.status === "REQUESTED") {
    return `Still ${status} on the ${cal} calendar — needs operator attention.`;
  }
  return `${cal} mission · ${status}.`;
}

function readinessLabel(level: string, score: number | null): string {
  if (score == null) return "Readiness pending";
  switch (level) {
    case "READY":
    case "COMPLETE":
      return `Ready · ${score}%`;
    case "MOSTLY_READY":
      return `Mostly ready · ${score}%`;
    case "AT_RISK":
      return `At risk · ${score}%`;
    case "IN_PROGRESS":
      return `In progress · ${score}%`;
    default:
      return `Not started · ${score}%`;
  }
}

function riskFromReadiness(
  readiness: EventReadinessResult | null,
  status: string,
): { level: MissionRiskLevel; note: string | null } {
  if (readiness?.criticalBlockers?.length) {
    const top = readiness.criticalBlockers[0];
    return {
      level: "CRITICAL",
      note: top.message,
    };
  }
  if (readiness?.readinessLevel === "AT_RISK") {
    const warn = readiness.domains.flatMap((d) => d.warnings)[0];
    return {
      level: "HIGH",
      note: warn?.message ?? "Mission readiness is at risk.",
    };
  }
  if (status === "DRAFT" || status === "REQUESTED" || status === "HOLD") {
    return { level: "WATCH", note: "Mission is not fully confirmed yet." };
  }
  return { level: "NONE", note: null };
}

function immediateAction(
  event: SafeEventProjection,
  readiness: EventReadinessResult | null,
): MissionImmediateAction {
  const href = `/calendar?event=${event.eventId}`;
  const nba = readiness?.nextBestActions?.[0];
  if (nba) {
    return {
      label: nba.title,
      explanation: nba.explanation,
      priority: nba.priority,
      href: nba.targetRoute || href,
    };
  }
  if (readiness?.readinessLevel === "AT_RISK") {
    return {
      label: "Resolve blockers",
      explanation: "Clear readiness blockers before this mission starts.",
      priority: "HIGH",
      href,
    };
  }
  if (event.status === "DRAFT" || event.status === "REQUESTED") {
    return {
      label: "Advance planning",
      explanation: "Move this mission toward confirmation.",
      priority: "MEDIUM",
      href,
    };
  }
  return {
    label: "Open mission",
    explanation: "Review details and stay ready for the next move.",
    priority: "LOW",
    href,
  };
}

/**
 * Pure mapper: safe event projection (+ optional OI readiness) → Mission Card.
 * Leave By remains a contract hook for Step 6.3.
 */
export function toMissionCard(input: {
  event: SafeEventProjection;
  timezone: string;
  readiness?: EventReadinessResult | null;
  isNext?: boolean;
  ownerLabel?: string;
  leaveBy?: LeaveByHook;
}): MissionCard {
  const { event, timezone } = input;
  const readiness = input.readiness ?? null;
  const risk = riskFromReadiness(readiness, event.status);
  const score = readiness ? readiness.overallScore : null;
  const level = readiness?.readinessLevel ?? "NOT_STARTED";

  return {
    missionId: event.eventId,
    title: event.title,
    whenLabel: `${formatTime(event.startsAt, timezone)} – ${formatTime(event.endsAt, timezone)}`,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    whereLabel: event.location?.label || "Location TBD",
    whyItMatters: whyItMatters(event),
    ownerLabel: input.ownerLabel ?? event.primaryCalendar.name,
    readinessLevel: level,
    readinessScore: score,
    readinessLabel: readinessLabel(level, score),
    riskLevel: risk.level,
    riskNote: risk.note,
    immediateAction: immediateAction(event, readiness),
    leaveBy: input.leaveBy ?? emptyLeaveByHook("not_computed"),
    isNext: Boolean(input.isNext),
    status: event.status,
  };
}
