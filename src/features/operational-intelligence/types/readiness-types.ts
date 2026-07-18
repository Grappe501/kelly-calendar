export type ReadinessLevel =
  | "NOT_STARTED"
  | "AT_RISK"
  | "IN_PROGRESS"
  | "MOSTLY_READY"
  | "READY"
  | "COMPLETE";

export type ReadinessBlocker = {
  code: string;
  domain: string;
  message: string;
  critical: boolean;
};

export type ReadinessWarning = {
  code: string;
  domain: string;
  message: string;
};

export type NextBestAction = {
  id: string;
  eventId: string;
  title: string;
  explanation: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  domain: string;
  actionType: string;
  targetRoute?: string;
  dueAt?: string;
  assignedUserId?: string;
  assignedTeamId?: string;
  canViewerAct: boolean;
};

export type EventReadinessResult = {
  eventId: string;
  calculatedAt: string;
  overallScore: number;
  readinessLevel: ReadinessLevel;
  domains: Array<{
    domain: string;
    score: number;
    weight: number;
    status: string;
    completedItems: number;
    requiredItems: number;
    blockers: ReadinessBlocker[];
    warnings: ReadinessWarning[];
  }>;
  criticalBlockers: ReadinessBlocker[];
  nextBestActions: NextBestAction[];
  eventVersion: number;
  calculationVersion: string;
};

export type EventCompletionResult = {
  eventId: string;
  completionScore: number;
  completionLevel:
    | "NOT_STARTED"
    | "EVENT_COMPLETE"
    | "FOLLOWUP_IN_PROGRESS"
    | "FULLY_CLOSED";
  occurredConfirmed: boolean;
  candidateAttendanceConfirmed: boolean;
  domains: Array<{
    domain: string;
    score: number;
    missingItems: string[];
  }>;
  unresolvedCommitments: number;
  overdueFollowups: number;
  unreturnedMaterials: number;
};
