export type CommExecutionMode =
  | "MANUAL_SANDBOX"
  | "SCHEDULED_SANDBOX"
  | "CONTROLLED_LIVE_TEST"
  | "PRODUCTION";

export const D25_ENABLED_EXECUTION_MODES: readonly CommExecutionMode[] = [
  "MANUAL_SANDBOX",
  "SCHEDULED_SANDBOX",
] as const;

export const D25_BLOCKED_EXECUTION_MODES: readonly CommExecutionMode[] = [
  "CONTROLLED_LIVE_TEST",
  "PRODUCTION",
] as const;

export type CampaignRevisionSnapshot = {
  channel: "EMAIL" | "SMS";
  compositionId: string | null;
  compositionRevisionId: string | null;
  recipientManifestId: string | null;
  providerKey: string;
  providerMode: string;
  timezone: string;
  purpose: string | null;
};

export type ScheduleWindowInput = {
  timezone: string;
  scheduledStartAt: Date | string | null;
  scheduledEndAt: Date | string | null;
  dailyWindowStart?: string | null;
  dailyWindowEnd?: string | null;
  allowedWeekdays?: number[];
  blackouts?: Array<{ startsAt: Date | string; endsAt: Date | string }>;
  now?: Date;
};

export type RatePolicy = {
  maximumRecipients: number;
  maximumBatchSize: number;
  maximumAttemptsPerRun: number;
  maximumAttemptsPerHour: number;
  minimumDelayBetweenBatchesSeconds: number;
};

export type RetryClassification =
  | "NON_RETRYABLE"
  | "RETRYABLE"
  | "REVIEW_REQUIRED"
  | "UNKNOWN";
