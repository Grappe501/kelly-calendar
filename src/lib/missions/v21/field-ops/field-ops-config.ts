/** Centralized Field Day Operations / Live Kit Confirmation policy. */
export type FieldOpsConfig = {
  allowedPastDays: number;
  allowedFutureDays: number;
  maxSummaryChars: number;
  maxNotesChars: number;
  sectionLimits: { findings: number; dayMissions: number; items: number };
};

export const DEFAULT_FIELD_OPS_CONFIG: FieldOpsConfig = {
  allowedPastDays: 14,
  allowedFutureDays: 30,
  maxSummaryChars: 1500,
  maxNotesChars: 4000,
  sectionLimits: { findings: 24, dayMissions: 40, items: 100 },
};
