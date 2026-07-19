import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";

/**
 * Step 6.4 — Today’s Readiness (actionable, honest Unknown).
 * Consumes OI EventReadinessResult domains; does not invent completion.
 */

export const READINESS_CATEGORIES = [
  "Schedule",
  "Travel",
  "People",
  "Materials",
  "Location",
  "Communications",
  "Follow-up",
] as const;

export type ReadinessCategory = (typeof READINESS_CATEGORIES)[number];

export type CategoryReadinessState =
  | "READY"
  | "NEEDS_ATTENTION"
  | "BLOCKED"
  | "UNKNOWN";

export type MissionReadinessState = CategoryReadinessState;

export type CategoryReadiness = {
  category: ReadinessCategory;
  state: CategoryReadinessState;
  detail: string | null;
};

export type MissionTodayReadiness = {
  missionId: string;
  missionTitle: string;
  state: MissionReadinessState;
  categories: CategoryReadiness[];
  topIssue: string | null;
  correctiveAction: {
    label: string;
    href: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  } | null;
};

export type TodayReadinessSummary = {
  missionCount: number;
  readyCount: number;
  needsAttentionCount: number;
  blockedCount: number;
  unknownCount: number;
  topIssue: string | null;
  nextAction: {
    label: string;
    href: string;
    missionId: string | null;
  } | null;
  missions: MissionTodayReadiness[];
};

const DOMAIN_TO_CATEGORY: Record<string, ReadinessCategory> = {
  "Date and Time": "Schedule",
  "Basic Event Details": "Schedule",
  Travel: "Travel",
  Staffing: "People",
  "Candidate Role": "People",
  "Host and Contact": "People",
  Packing: "Materials",
  Location: "Location",
  Communications: "Communications",
  "Follow-Up Preparation": "Follow-up",
};

const STATE_RANK: Record<CategoryReadinessState, number> = {
  BLOCKED: 0,
  NEEDS_ATTENTION: 1,
  UNKNOWN: 2,
  READY: 3,
};

function worstState(
  states: CategoryReadinessState[],
): CategoryReadinessState {
  if (states.length === 0) return "UNKNOWN";
  return states.reduce((a, b) => (STATE_RANK[a] < STATE_RANK[b] ? a : b));
}

function domainState(
  domain: EventReadinessResult["domains"][number],
  criticalInDomain: boolean,
): CategoryReadinessState {
  if (domain.status === "NOT_REQUIRED") return "UNKNOWN";
  if (criticalInDomain || domain.blockers.some((b) => b.critical)) return "BLOCKED";
  if (domain.status === "COMPLETE" && domain.score >= 100) return "READY";
  if (domain.status === "INCOMPLETE" || domain.score < 100) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

/**
 * Map OI readiness → mission readiness with 7 operator categories.
 * Missing OI result → all Unknown (never silent Ready).
 */
export function buildMissionTodayReadiness(input: {
  missionId: string;
  missionTitle: string;
  readiness: EventReadinessResult | null | undefined;
}): MissionTodayReadiness {
  const { missionId, missionTitle, readiness } = input;
  // Calendar consumes `event` (HL-039). Date resolved server-side when omitted.
  const href = `/calendar?view=day&event=${encodeURIComponent(missionId)}`;

  if (!readiness) {
    const categories = READINESS_CATEGORIES.map((category) => ({
      category,
      state: "UNKNOWN" as const,
      detail: "Readiness data not loaded for this mission.",
    }));
    return {
      missionId,
      missionTitle,
      state: "UNKNOWN",
      categories,
      topIssue: "Readiness unknown — no OI snapshot yet.",
      correctiveAction: {
        label: "Open mission",
        href,
        priority: "MEDIUM",
      },
    };
  }

  const criticalCodes = new Set(
    readiness.criticalBlockers.map((b) => `${b.domain}:${b.code}`),
  );

  const byCategory = new Map<
    ReadinessCategory,
    { states: CategoryReadinessState[]; details: string[] }
  >();
  for (const cat of READINESS_CATEGORIES) {
    byCategory.set(cat, { states: [], details: [] });
  }

  for (const d of readiness.domains) {
    const category = DOMAIN_TO_CATEGORY[d.domain];
    if (!category) continue;
    // NOT_REQUIRED domains do not count as Ready — skip them; empty → Unknown.
    if (d.status === "NOT_REQUIRED") continue;
    const criticalInDomain = d.blockers.some(
      (b) => b.critical || criticalCodes.has(`${d.domain}:${b.code}`),
    );
    const state = domainState(d, criticalInDomain);
    const bucket = byCategory.get(category)!;
    bucket.states.push(state);
    if (state === "BLOCKED") {
      const msg = d.blockers[0]?.message ?? `${d.domain} blocked`;
      bucket.details.push(msg);
    } else if (state === "NEEDS_ATTENTION") {
      bucket.details.push(
        d.warnings[0]?.message ??
          `${d.domain}: ${d.completedItems}/${d.requiredItems} complete`,
      );
    }
  }

  const categories: CategoryReadiness[] = READINESS_CATEGORIES.map((category) => {
    const bucket = byCategory.get(category)!;
    if (bucket.states.length === 0) {
      return {
        category,
        state: "UNKNOWN",
        detail: "No applicable OI domain mapped for this category.",
      };
    }
    // If every mapped domain is NOT_REQUIRED→UNKNOWN only, stay UNKNOWN.
    const state = worstState(bucket.states);
    return {
      category,
      state,
      detail: bucket.details[0] ?? null,
    };
  });

  const state = worstState(categories.map((c) => c.state));

  const critical = readiness.criticalBlockers[0];
  const attentionCat = categories.find((c) => c.state === "BLOCKED")
    ?? categories.find((c) => c.state === "NEEDS_ATTENTION");
  const nba = readiness.nextBestActions[0];

  const topIssue =
    critical?.message ??
    attentionCat?.detail ??
    (state === "UNKNOWN" ? "Some readiness categories are still unknown." : null);

  const correctiveAction = nba
    ? {
        label: nba.title,
        href: nba.targetRoute || href,
        priority: nba.priority,
      }
    : attentionCat
      ? {
          label: `Review ${attentionCat.category.toLowerCase()}`,
          href,
          priority:
            attentionCat.state === "BLOCKED"
              ? ("CRITICAL" as const)
              : ("HIGH" as const),
        }
      : null;

  return {
    missionId,
    missionTitle,
    state,
    categories,
    topIssue,
    correctiveAction,
  };
}

export function buildTodayReadinessSummary(
  missions: MissionTodayReadiness[],
): TodayReadinessSummary {
  const readyCount = missions.filter((m) => m.state === "READY").length;
  const needsAttentionCount = missions.filter(
    (m) => m.state === "NEEDS_ATTENTION",
  ).length;
  const blockedCount = missions.filter((m) => m.state === "BLOCKED").length;
  const unknownCount = missions.filter((m) => m.state === "UNKNOWN").length;

  const ordered = [...missions].sort(
    (a, b) => STATE_RANK[a.state] - STATE_RANK[b.state],
  );
  const priority = ordered[0];
  const topIssue = priority?.topIssue ?? null;
  const nextAction = priority?.correctiveAction
    ? {
        label: priority.correctiveAction.label,
        href: priority.correctiveAction.href,
        missionId: priority.missionId,
      }
    : null;

  return {
    missionCount: missions.length,
    readyCount,
    needsAttentionCount,
    blockedCount,
    unknownCount,
    topIssue,
    nextAction,
    missions: ordered,
  };
}
