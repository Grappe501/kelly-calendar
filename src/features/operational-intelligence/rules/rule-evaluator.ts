import {
  OPERATIONAL_RULES,
  type RuleContext,
} from "@/features/operational-intelligence/rules/rule-registry";
import type { OperationalRecommendation } from "@/features/operational-intelligence/types/recommendation-types";

const CATEGORY_ORDER: Record<string, number> = {
  safety: 1,
  compliance: 2,
  candidate: 3,
  travel: 4,
  operations: 5,
  communications: 6,
  staffing: 7,
  packing: 8,
  optimization: 9,
  historical: 10,
};

/**
 * Deterministic recommendations. Safety/compliance outrank optimization.
 * Protected visibility suppresses public promotion recommendations.
 */
export function evaluateRecommendations(
  ctx: RuleContext,
  options?: { rejectedKeys?: Set<string> },
): OperationalRecommendation[] {
  const rejected = options?.rejectedKeys ?? new Set<string>();
  const protectedContext =
    ctx.calendarType === "PROTECTED_PERSONAL" ||
    ctx.sensitivityLevel === "PROTECTED" ||
    ctx.locationDisclosure === "HIDDEN";

  const collected: OperationalRecommendation[] = [];
  for (const rule of OPERATIONAL_RULES) {
    if (!rule.applies(ctx)) continue;
    for (const rec of rule.recommend(ctx)) {
      if (rejected.has(rec.id)) continue;
      if (
        protectedContext &&
        (rec.recommendationType === "COMMUNICATIONS" ||
          /public|promo|publish/i.test(rec.title))
      ) {
        continue;
      }
      collected.push(rec);
    }
  }

  return collected.sort((a, b) => {
    const catA = CATEGORY_ORDER[a.precedenceRank < 10 ? "safety" : "operations"] ?? 50;
    void catA;
    if (a.precedenceRank !== b.precedenceRank) return a.precedenceRank - b.precedenceRank;
    const p = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
    return p[a.priority] - p[b.priority];
  });
}

export function listRuleCoverage() {
  return OPERATIONAL_RULES.map((r) => ({
    id: r.id,
    category: r.category,
    precedenceRank: r.precedenceRank,
  }));
}
