import "server-only";

import { classifyDatabaseTarget } from "@/lib/db/database-target";
import { loadApprovedEnvironment } from "@/lib/env/load-server-environment";
import { tryGetPublicEnvironment } from "@/lib/env/public-environment";
import { getServerEnvironment } from "@/lib/env/server-environment";
import type { EnvironmentSourceReport } from "@/lib/env/types";

export type EnvironmentCapabilityStatus = {
  publicConfigurationValid: boolean;
  publicError?: string;
  database: "configured" | "missing" | "invalid";
  directDatabase: "configured" | "missing" | "invalid";
  supabaseBrowser: "configured" | "missing";
  supabaseServer: "configured" | "missing";
  openAi: "configured" | "missing";
  sessionSecret: "configured" | "missing";
  redDirtFallback: {
    enabled: boolean;
    used: boolean;
  };
  sources: EnvironmentSourceReport;
  publicSafe: {
    appName: string;
    timezone: string;
    electionDate: string;
    appUrl?: string;
  };
};

export function getEnvironmentCapabilityStatus(): EnvironmentCapabilityStatus {
  const loaded = loadApprovedEnvironment();
  const server = getServerEnvironment();
  const publicResult = tryGetPublicEnvironment(loaded.env);

  const dbClass = classifyDatabaseTarget(server.databaseUrl);
  const directClass = classifyDatabaseTarget(server.directUrl);

  if (server.databaseUrl && loaded.sources.DATABASE_URL) {
    loaded.sources.DATABASE_URL.classification = dbClass;
  }

  return {
    publicConfigurationValid: publicResult.ok,
    publicError: publicResult.ok ? undefined : publicResult.error,
    database:
      dbClass === "missing"
        ? "missing"
        : dbClass === "invalid"
          ? "invalid"
          : "configured",
    directDatabase:
      directClass === "missing"
        ? "missing"
        : directClass === "invalid"
          ? "invalid"
          : "configured",
    supabaseBrowser: loaded.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
    supabaseServer: server.supabaseServiceRoleKey ? "configured" : "missing",
    openAi: server.openAiApiKey ? "configured" : "missing",
    sessionSecret: server.appSessionSecret ? "configured" : "missing",
    redDirtFallback: {
      enabled: loaded.redDirtFallbackEnabled,
      used: loaded.redDirtFallbackUsed,
    },
    sources: loaded.sources,
    publicSafe: {
      appName: publicResult.ok
        ? publicResult.value.appName
        : "Kelly Campaign Command Calendar",
      timezone: publicResult.ok
        ? publicResult.value.campaignTimezone
        : "America/Chicago",
      electionDate: publicResult.ok
        ? publicResult.value.electionDate
        : "2026-11-03",
      appUrl: publicResult.ok ? publicResult.value.appUrl : undefined,
    },
  };
}
