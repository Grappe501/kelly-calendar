import { getSecretPresence, redactConnectionTarget } from "@/lib/env/server-presence";

export const CURRENT_STEP_ID = "KCCC-STEP-02-APP-SCAFFOLD";
export const CURRENT_STEP_NUMBER = 2;
export const TOTAL_STEPS = 25;
export const PRODUCT_CODE = "KCCC";
export const SERVICE_NAME = "kelly-campaign-command-calendar";

export type CapabilityStatus = {
  application: {
    ready: boolean;
    step: number;
    totalSteps: number;
    stepId: string;
  };
  database: {
    configured: boolean;
    tested: boolean;
    mutable: false;
    targetType: "missing" | "local_loopback" | "hosted_postgresql" | "unknown";
  };
  authentication: {
    enabled: false;
  };
  ai: {
    configured: boolean;
    enabled: false;
    authority: "proposal_only";
  };
  deployment: {
    provider: "netlify";
    environment: string;
  };
  environment: {
    publicConfigReady: boolean;
    secretsConfiguredCount: number;
  };
};

export function getCapabilityStatus(options?: {
  databaseTested?: boolean;
}): CapabilityStatus {
  const secrets = getSecretPresence();
  const target = redactConnectionTarget(process.env.DATABASE_URL);
  const secretsConfiguredCount = Object.values(secrets).filter(Boolean).length;

  return {
    application: {
      ready: true,
      step: CURRENT_STEP_NUMBER,
      totalSteps: TOTAL_STEPS,
      stepId: CURRENT_STEP_ID,
    },
    database: {
      configured: secrets.databaseUrl,
      tested: Boolean(options?.databaseTested),
      mutable: false,
      targetType: target.targetType,
    },
    authentication: {
      enabled: false,
    },
    ai: {
      configured: secrets.openaiApiKey,
      enabled: false,
      authority: "proposal_only",
    },
    deployment: {
      provider: "netlify",
      environment: process.env.NODE_ENV ?? "development",
    },
    environment: {
      publicConfigReady: true,
      secretsConfiguredCount,
    },
  };
}
