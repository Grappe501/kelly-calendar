export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RecommendationEvidence = {
  source: string;
  summary: string;
  sampleSize?: number;
};

export type OperationalRecommendation = {
  id: string;
  recommendationType: string;
  fieldPath?: string;
  proposedValue?: unknown;
  title: string;
  description: string;
  confidence: number;
  priority: RecommendationPriority;
  reasons: string[];
  evidence: RecommendationEvidence[];
  action:
    | "ADD_ITEM"
    | "CHANGE_VALUE"
    | "REQUEST_INFORMATION"
    | "CREATE_APPROVAL"
    | "FLAG_CONFLICT"
    | "APPLY_WORKFLOW";
  requiresHumanApproval: true;
  precedenceRank: number;
};

export type RecommendationDecision =
  | "ACCEPTED"
  | "REJECTED"
  | "MODIFIED"
  | "DISMISSED"
  | "DEFERRED";
