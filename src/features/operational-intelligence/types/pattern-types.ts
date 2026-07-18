export type PatternScope =
  | "GLOBAL"
  | "EVENT_TYPE"
  | "CALENDAR_TYPE"
  | "COUNTY"
  | "REGION"
  | "ORGANIZATION"
  | "VENUE"
  | "TEAM";

export type HistoricalPattern = {
  patternType: string;
  scopeType: PatternScope;
  scopeKey: string;
  sampleSize: number;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  confidence: number;
  signalValue: unknown;
  evidenceSummary: string;
  calculationVersion: string;
  calculatedAt: string;
};
