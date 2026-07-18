export type RecommendationDecisionInput = {
  recommendationId: string;
  eventId: string;
  decision: "ACCEPTED" | "REJECTED" | "MODIFIED" | "DISMISSED" | "DEFERRED";
  actorUserId: string;
  modifiedValue?: unknown;
  reason?: string;
  eventVersion: number;
};

export async function persistRecommendationDecision(
  _input: RecommendationDecisionInput,
): Promise<{ ok: false; code: "AUTHENTICATION_REQUIRED" }> {
  void _input;
  return { ok: false, code: "AUTHENTICATION_REQUIRED" };
}
