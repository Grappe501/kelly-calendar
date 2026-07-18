export type ConflictSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";

export type SuggestedResolution = {
  code: string;
  label: string;
  autonomous: false;
};

export type OperationalConflict = {
  id: string;
  conflictType: string;
  severity: ConflictSeverity;
  primaryEntity: { type: string; id: string; label: string };
  relatedEntity?: { type: string; id: string; label: string };
  startsAt?: string;
  endsAt?: string;
  explanation: string;
  evidence: string[];
  suggestedResolutions: SuggestedResolution[];
  automaticallyResolved: false;
};

export type TravelFeasibility =
  | "FEASIBLE"
  | "TIGHT"
  | "UNLIKELY"
  | "IMPOSSIBLE"
  | "UNKNOWN";
