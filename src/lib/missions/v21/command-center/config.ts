/**
 * Centralized Mission Command Center thresholds.
 * Where policy is not yet approved, null means age display without “overdue” language.
 */

export type MissionCommandCenterConfig = {
  upcomingWindowDays: number;
  recentlyClosedWindowDays: number;
  prepareRiskWindowHours: number;
  executeNotStartedGraceMinutes: number;
  arrivedNotStartedWarningMinutes: number;
  executionOverrunWarningMinutes: number;
  /** null = show age, do not label “overdue” */
  debriefExpectedWithinHours: number | null;
  debriefApprovalExpectedWithinHours: number | null;
  sectionLimits: {
    immediateAttention: number;
    activeNow: number;
    comingNext: number;
    preparationRisk: number;
    executionExceptions: number;
    debriefQueue: number;
    followUpAccountability: number;
    commitments: number;
    blockedWork: number;
    readyToClose: number;
    recentlyClosed: number;
  };
};

export const DEFAULT_COMMAND_CENTER_CONFIG: MissionCommandCenterConfig = {
  upcomingWindowDays: 14,
  recentlyClosedWindowDays: 7,
  prepareRiskWindowHours: 72,
  executeNotStartedGraceMinutes: 30,
  arrivedNotStartedWarningMinutes: 45,
  executionOverrunWarningMinutes: 90,
  debriefExpectedWithinHours: 24,
  debriefApprovalExpectedWithinHours: 48,
  sectionLimits: {
    immediateAttention: 10,
    activeNow: 5,
    comingNext: 8,
    preparationRisk: 8,
    executionExceptions: 8,
    debriefQueue: 10,
    followUpAccountability: 12,
    commitments: 10,
    blockedWork: 10,
    readyToClose: 8,
    recentlyClosed: 8,
  },
};
