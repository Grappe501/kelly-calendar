import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { getEnvironmentCapabilityStatus } from "@/lib/env/environment-status";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import {
  CALENDAR_RECOVERY_BUILD_ID,
  COMMUNICATIONS_OS_TRACK_STATUS,
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  LG1_CONTROLLED_LIVE_TEST_STATUS,
  NEXT_AUTHORIZED_BUILD,
  TOTAL_STEPS,
} from "@/lib/system/constants";

export {
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  TOTAL_STEPS,
  PRODUCT_CODE,
  SERVICE_NAME,
  CALENDAR_RECOVERY_BUILD_ID,
  COMMUNICATIONS_OS_TRACK_STATUS,
  LG1_CONTROLLED_LIVE_TEST_STATUS,
  NEXT_AUTHORIZED_BUILD,
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
    communicationsTrack: string;
    lg1Status: string;
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
      primaryFocus: "complete Step 8 security closeout",
      nextAuthorizedBuild: NEXT_AUTHORIZED_BUILD,
      communicationsTrack: COMMUNICATIONS_OS_TRACK_STATUS,
      lg1Status: LG1_CONTROLLED_LIVE_TEST_STATUS,
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
      "Calendar foundation in progress — primary build focus is Step 8 security closeout, then Step 9 canonical calendar model.",
      authFlags.authenticationComplete
        ? "Authentication infrastructure is present. Operator certification still incomplete until Step 8 closeout acceptance."
        : "Authentication is not configured (set APP_SESSION_SECRET). Do not enter real candidate schedule information.",
      "Real candidate schedule data is prohibited until candidate-data readiness is certified.",
      "Communications OS (D20–D26) is frozen and not production-enabled. LG-1 is paused.",
      "Monday–Friday 8am–noon and 1pm–5pm are standing work-unavailable blocks (vacation override required).",
      "Tuesdays default to Little Rock unless overridden.",
    ],
  };
}
