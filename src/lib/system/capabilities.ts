import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { getEnvironmentCapabilityStatus } from "@/lib/env/environment-status";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";
import {
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  TOTAL_STEPS,
} from "@/lib/system/constants";

export {
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  TOTAL_STEPS,
  PRODUCT_CODE,
  SERVICE_NAME,
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
    enabled: false;
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

  return {
    ok: true,
    application: {
      ready: true,
      step: CURRENT_STEP_NUMBER,
      totalSteps: TOTAL_STEPS,
      stepId: CURRENT_STEP_ID,
      environment: process.env.NODE_ENV ?? "development",
      commitRef: process.env.COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
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
      publicConfigurationPresent: envStatus.supabaseBrowser === "configured",
      serviceConfigurationPresent: envStatus.supabaseServer === "configured",
      enabled: false,
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
      "The environment and security foundation is active, but authentication and calendar data protections are not complete. Do not enter real candidate schedule information.",
      "Monday–Friday 8am–noon and 1pm–5pm are standing work-unavailable blocks (vacation override required).",
      "Tuesdays default to Little Rock unless overridden.",
    ],
  };
}
