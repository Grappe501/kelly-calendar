import type { IncidentLogConfig } from "@/lib/missions/v21/incident-log/incident-config";
import { DEFAULT_INCIDENT_LOG_CONFIG } from "@/lib/missions/v21/incident-log/incident-config";

export type ExceptionDigestConfig = IncidentLogConfig & {
  sectionLimits: IncidentLogConfig["sectionLimits"] & {
    digestEntries: number;
  };
};

export const DEFAULT_EXCEPTION_DIGEST_CONFIG: ExceptionDigestConfig = {
  ...DEFAULT_INCIDENT_LOG_CONFIG,
  sectionLimits: {
    ...DEFAULT_INCIDENT_LOG_CONFIG.sectionLimits,
    digestEntries: 80,
  },
};

export const EXCEPTION_DIGEST_BOUNDARY =
  "Campaign Day Exception Digest consolidates stored incident facts for Closeout and next-day Launch. It does not resolve incidents, create tickets, or complete Closeout or Morning Review.";
