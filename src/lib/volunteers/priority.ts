/**
 * Deterministic volunteer / work priority (IC-02D) — no AI ranking.
 */

export type PriorityTier = 1 | 2 | 3 | 4 | 5;

export type PriorityInput = {
  id: string;
  title: string;
  dueAt?: Date | string | null;
  status?: string | null;
  blocksMissionWithinHours?: number | null;
  criticalRoleUnfilled?: boolean;
  confirmationDeadlineHours?: number | null;
  volunteerCancellation?: boolean;
  trainingDependency?: boolean;
  countyLeadershipVacancy?: boolean;
  noOwner?: boolean;
  explicitLeadershipPriority?: boolean;
  logisticsDependency?: boolean;
  communicationsDependency?: boolean;
  sourceHref: string;
};

export type PrioritizedItem = {
  id: string;
  title: string;
  tier: PriorityTier;
  reasons: string[];
  dueAt: string | null;
  sourceHref: string;
  recommendedScreen: string;
};

function hoursUntil(dueAt: Date | string | null | undefined): number | null {
  if (!dueAt) return null;
  const t = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  if (Number.isNaN(t.getTime())) return null;
  return (t.getTime() - Date.now()) / 36e5;
}

export function scorePriority(item: PriorityInput): PrioritizedItem {
  const reasons: string[] = [];
  let tier: PriorityTier = 5;
  const hours = hoursUntil(item.dueAt);

  if (item.explicitLeadershipPriority) {
    reasons.push("Explicit leadership priority");
    tier = 1;
  }
  if (item.blocksMissionWithinHours != null && item.blocksMissionWithinHours <= 48) {
    reasons.push(`Blocks Mission within ${Math.round(item.blocksMissionWithinHours)} hours`);
    tier = Math.min(tier, 1) as PriorityTier;
  }
  if (item.criticalRoleUnfilled) {
    reasons.push("Critical role unfilled");
    tier = Math.min(tier, 1) as PriorityTier;
  }
  if (hours != null && hours < 0) {
    reasons.push("Task overdue");
    tier = Math.min(tier, 1) as PriorityTier;
  }
  if (item.volunteerCancellation) {
    reasons.push("Volunteer cancellation");
    tier = Math.min(tier, 2) as PriorityTier;
  }
  if (item.confirmationDeadlineHours != null && item.confirmationDeadlineHours <= 24) {
    reasons.push("Confirmation deadline approaching");
    tier = Math.min(tier, 2) as PriorityTier;
  }
  if (item.noOwner) {
    reasons.push("No owner");
    tier = Math.min(tier, 2) as PriorityTier;
  }
  if (item.countyLeadershipVacancy) {
    reasons.push("County leadership vacancy");
    tier = Math.min(tier, 3) as PriorityTier;
  }
  if (item.trainingDependency) {
    reasons.push("Training dependency");
    tier = Math.min(tier, 3) as PriorityTier;
  }
  if (item.logisticsDependency) {
    reasons.push("Logistics dependency");
    tier = Math.min(tier, 3) as PriorityTier;
  }
  if (item.communicationsDependency) {
    reasons.push("Communications dependency");
    tier = Math.min(tier, 3) as PriorityTier;
  }
  if (reasons.length === 0) {
    reasons.push("Scheduled work");
    tier = 5;
  }

  return {
    id: item.id,
    title: item.title,
    tier,
    reasons,
    dueAt: item.dueAt
      ? (typeof item.dueAt === "string" ? item.dueAt : item.dueAt.toISOString())
      : null,
    sourceHref: item.sourceHref,
    recommendedScreen: item.sourceHref,
  };
}

/** Return at most `limit` items, lowest tier first, explainable. */
export function prioritizeTop(
  items: PriorityInput[],
  limit = 5,
): PrioritizedItem[] {
  return items
    .map(scorePriority)
    .sort((a, b) => a.tier - b.tier || a.title.localeCompare(b.title))
    .slice(0, limit);
}
