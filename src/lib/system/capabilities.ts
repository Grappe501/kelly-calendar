import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { getEnvironmentCapabilityStatus } from "@/lib/env/environment-status";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import {
  CALENDAR_COMPLETION_NEXT_BUILD_ID,
  CALENDAR_COMPLETION_PROGRAM_STATUS,
  CALENDAR_RECOVERY_BUILD_ID,
  COMMUNICATIONS_OS_TRACK_STATUS,
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  LG1_CONTROLLED_LIVE_TEST_STATUS,
  NEXT_AUTHORIZED_BUILD,
  OPERATOR_USABILITY_PASS_STATUS,
  STEP_8_CLOSEOUT_STATUS,
  STEP_9_CANONICAL_EVENT_STATUS,
  STEP_10_OPERATING_VIEWS_STATUS,
  STEP_11_EVENT_EDITING_STATUS,
  STEP_12_AVAILABILITY_STATUS,
  TOTAL_STEPS,
  UNRELATED_CAMPAIGN_EXPANSION_STATUS,
} from "@/lib/system/constants";

export {
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  TOTAL_STEPS,
  PRODUCT_CODE,
  SERVICE_NAME,
  CALENDAR_COMPLETION_NEXT_BUILD_ID,
  CALENDAR_COMPLETION_PROGRAM_STATUS,
  CALENDAR_RECOVERY_BUILD_ID,
  COMMUNICATIONS_OS_TRACK_STATUS,
  LG1_CONTROLLED_LIVE_TEST_STATUS,
  NEXT_AUTHORIZED_BUILD,
  OPERATOR_USABILITY_PASS_STATUS,
  STEP_8_CLOSEOUT_STATUS,
  STEP_9_CANONICAL_EVENT_STATUS,
  STEP_10_OPERATING_VIEWS_STATUS,
  STEP_11_EVENT_EDITING_STATUS,
  STEP_12_AVAILABILITY_STATUS,
  UNRELATED_CAMPAIGN_EXPANSION_STATUS,
} from "@/lib/system/constants";

export type CapabilityStatus = {
  ok: true;
  application: {
    ready: boolean;
    step: number;
    totalSteps: number;
    stepId: string;
    environment: string;
    commitRef: string | null;
    recoveryBuildId: string;
    primaryFocus: string;
    nextAuthorizedBuild: string;
    calendarCompletionProgramStatus: string;
    unrelatedCampaignExpansionStatus: string;
    communicationsTrack: string;
    lg1Status: string;
    step8CloseoutStatus: string;
    step9CanonicalEventStatus: string;
    step10OperatingViewsStatus: string;
    step11EventEditingStatus: string;
    operatorUsabilityPassStatus: string;
    step12AvailabilityStatus: string;
  };
  environment: {
    publicConfigurationValid: boolean;
    database: string;
    directDatabase: string;
    supabaseBrowser: string;
    supabaseServer: string;
    openAi: string;
    redDirtFallbackEnabled: boolean;
    redDirtFallbackUsed: boolean;
  };
  database: {
    configured: boolean;
    tested: boolean;
    succeeded?: boolean;
    targetClass: string;
    mutable: false;
    migrationAuthorized: false;
  };
  authentication: {
    publicConfigurationPresent: boolean;
    serviceConfigurationPresent: boolean;
    enabled: boolean;
    plannedStep: 4;
  };
  ai: {
    configured: boolean;
    enabled: false;
    authority: "proposal_only";
    plannedStep: 16;
  };
  security: ReturnType<typeof getSecurityCapabilityStatus>;
  campaignAvailability: ReturnType<typeof getStandingAvailabilityPolicy>;
  deployment: {
    provider: "netlify";
  };
  warnings: string[];
};

export function getCapabilityStatus(options?: {
  databaseTested?: boolean;
  databaseSucceeded?: boolean;
  databaseTargetClass?: string;
}): CapabilityStatus {
  const envStatus = getEnvironmentCapabilityStatus();
  const security = getSecurityCapabilityStatus();
  const authFlags = getSharedAuthFlags();

  return {
    ok: true,
    application: {
      ready: true,
      step: CURRENT_STEP_NUMBER,
      totalSteps: TOTAL_STEPS,
      stepId: CURRENT_STEP_ID,
      environment: process.env.NODE_ENV ?? "development",
      commitRef: process.env.COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      recoveryBuildId: CALENDAR_RECOVERY_BUILD_ID,
      primaryFocus:
        "Calendar Completion — CC-01 complete; next CC-02 Integrity & Provenance Console",
      nextAuthorizedBuild: NEXT_AUTHORIZED_BUILD,
      calendarCompletionProgramStatus: CALENDAR_COMPLETION_PROGRAM_STATUS,
      unrelatedCampaignExpansionStatus: UNRELATED_CAMPAIGN_EXPANSION_STATUS,
      communicationsTrack: COMMUNICATIONS_OS_TRACK_STATUS,
      lg1Status: LG1_CONTROLLED_LIVE_TEST_STATUS,
      step8CloseoutStatus: STEP_8_CLOSEOUT_STATUS,
      step9CanonicalEventStatus: STEP_9_CANONICAL_EVENT_STATUS,
      step10OperatingViewsStatus: STEP_10_OPERATING_VIEWS_STATUS,
      step11EventEditingStatus: STEP_11_EVENT_EDITING_STATUS,
      operatorUsabilityPassStatus: OPERATOR_USABILITY_PASS_STATUS,
      step12AvailabilityStatus: STEP_12_AVAILABILITY_STATUS,
    },
    environment: {
      publicConfigurationValid: envStatus.publicConfigurationValid,
      database: envStatus.database,
      directDatabase: envStatus.directDatabase,
      supabaseBrowser: envStatus.supabaseBrowser,
      supabaseServer: envStatus.supabaseServer,
      openAi: envStatus.openAi,
      redDirtFallbackEnabled: envStatus.redDirtFallback.enabled,
      redDirtFallbackUsed: envStatus.redDirtFallback.used,
    },
    database: {
      configured: envStatus.database === "configured",
      tested: Boolean(options?.databaseTested),
      succeeded: options?.databaseSucceeded,
      targetClass: options?.databaseTargetClass ?? "unknown",
      mutable: false,
      migrationAuthorized: false,
    },
    authentication: {
      publicConfigurationPresent:
        envStatus.supabaseBrowser === "configured" || authFlags.authenticationComplete,
      serviceConfigurationPresent:
        envStatus.supabaseServer === "configured" || authFlags.authenticationComplete,
      enabled: authFlags.authenticationComplete,
      plannedStep: 4,
    },
    ai: {
      configured: envStatus.openAi === "configured",
      enabled: false,
      authority: "proposal_only",
      plannedStep: 16,
    },
    security,
    campaignAvailability: getStandingAvailabilityPolicy(),
    deployment: {
      provider: "netlify",
    },
    warnings: [
      authFlags.candidateDataReady
        ? "Step 8–11 complete — operator usability pass is OPEN; Step 12 Availability is not authorized yet."
        : "Calendar foundation in progress — complete Step 8 security closeout before real schedule entry.",
      authFlags.authenticationComplete
        ? "Authentication is enabled for campaign operators."
        : "Authentication is not configured (set APP_SESSION_SECRET).",
      "Canonical schedule entity is Prisma Event only — Mission/Travel/Briefing attach to Event.",
      "Communications OS (D20–D26) remains frozen and not production-enabled. LG-1 is paused.",
      "Monday–Friday 8am–noon and 1pm–5pm are standing work-unavailable blocks (vacation override required).",
      "Tuesdays default to Little Rock unless overridden.",
    ],
  };
}
