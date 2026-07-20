/** Centralized Mission Exception / Incident Log policy. */
export type IncidentLogConfig = {
  allowedPastDays: number;
  allowedFutureDays: number;
  maxSummaryChars: number;
  maxDescriptionChars: number;
  maxNotesChars: number;
  maxActionChars: number;
  sectionLimits: {
    findings: number;
    dayIncidents: number;
    missionIncidents: number;
    updates: number;
  };
};

export const DEFAULT_INCIDENT_LOG_CONFIG: IncidentLogConfig = {
  allowedPastDays: 14,
  allowedFutureDays: 30,
  maxSummaryChars: 500,
  maxDescriptionChars: 4000,
  maxNotesChars: 4000,
  maxActionChars: 2000,
  sectionLimits: {
    findings: 24,
    dayIncidents: 80,
    missionIncidents: 100,
    updates: 200,
  },
};

export const EMERGENCY_NOTICE =
  "For an immediate threat to life or safety, contact local emergency services and follow campaign emergency procedures. This log does not summon assistance.";
