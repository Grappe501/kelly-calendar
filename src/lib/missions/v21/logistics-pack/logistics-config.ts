/** Centralized Logistics Pack / Field Kit policy. */
export type LogisticsPackConfig = {
  allowedPastDays: number;
  allowedFutureDays: number;
  maxSummaryChars: number;
  maxNotesChars: number;
  maxItems: number;
  sectionLimits: { findings: number; dayMissions: number };
};

export const DEFAULT_LOGISTICS_PACK_CONFIG: LogisticsPackConfig = {
  allowedPastDays: 14,
  allowedFutureDays: 30,
  maxSummaryChars: 1500,
  maxNotesChars: 4000,
  maxItems: 100,
  sectionLimits: { findings: 20, dayMissions: 40 },
};
