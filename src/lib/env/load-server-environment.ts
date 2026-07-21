import "server-only";

import fs from "node:fs";
import path from "node:path";
import { APPROVED_REDDIRT_FALLBACK_KEYS } from "@/lib/env/approved-env-keys";
import type { EnvSource, EnvironmentSourceReport } from "@/lib/env/types";

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("loadApprovedEnvironment may only run on the server");
  }
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, "utf8");
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isNetlifyOrCi(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_BUILD_BASE ||
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION,
  );
}

function defaultFallbackEnabled(): boolean {
  // Never pull RedDirt secrets on Netlify/CI — production must set DATABASE_URL there.
  if (isNetlifyOrCi()) return false;
  if (process.env.ENV_FALLBACK_TO_REDDIRT !== undefined) {
    return isTruthy(process.env.ENV_FALLBACK_TO_REDDIRT);
  }
  // Local sandbox (including `next start` with NODE_ENV=production) may fill
  // approved missing keys from RedDirt so Prisma can connect.
  return true;
}

export type LoadedEnvironment = {
  env: Record<string, string | undefined>;
  sources: EnvironmentSourceReport;
  redDirtFallbackEnabled: boolean;
  redDirtFallbackUsed: boolean;
};

let cached: LoadedEnvironment | null = null;

/**
 * Precedence (highest → lowest among files; process.env never overwritten):
 * process.env > kelly-calendar/.env.local > .env > RedDirt/.env.local > RedDirt/.env
 * RedDirt fills only missing approved keys when fallback enabled.
 */
export function loadApprovedEnvironment(options?: {
  forceReload?: boolean;
  repoRoot?: string;
}): LoadedEnvironment {
  assertServerOnly();
  if (cached && !options?.forceReload) return cached;

  const repoRoot = options?.repoRoot ?? path.resolve(process.cwd());
  const workspaceRoot = path.resolve(repoRoot, "..");
  const redDirtFallbackEnabled = defaultFallbackEnabled();

  const sources: EnvironmentSourceReport = {};
  const merged: Record<string, string | undefined> = {};
  let redDirtFallbackUsed = false;

  const mark = (key: string, source: EnvSource, classification?: string) => {
    sources[key] = {
      configured: source !== "missing",
      source,
      classification,
    };
  };

  const applyFile = (
    filePath: string,
    source: EnvSource,
    allowlist?: readonly string[],
  ) => {
    if (!fs.existsSync(filePath)) return;
    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (allowlist && !allowlist.includes(key)) continue;
      if (merged[key] !== undefined && merged[key] !== "") continue;
      if (process.env[key] !== undefined && process.env[key] !== "") continue;
      merged[key] = value;
      mark(key, source);
      if (source === "reddirt_env" || source === "reddirt_env_local") {
        redDirtFallbackUsed = true;
      }
    }
  };

  // Seed from process.env (highest)
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== "") {
      merged[key] = value;
      mark(key, "process_environment");
    }
  }

  applyFile(path.join(repoRoot, ".env.local"), "calendar_env_local");
  applyFile(path.join(repoRoot, ".env"), "calendar_env");

  if (redDirtFallbackEnabled) {
    applyFile(
      path.join(workspaceRoot, "RedDirt", ".env.local"),
      "reddirt_env_local",
      APPROVED_REDDIRT_FALLBACK_KEYS,
    );
    applyFile(
      path.join(workspaceRoot, "RedDirt", ".env"),
      "reddirt_env",
      APPROVED_REDDIRT_FALLBACK_KEYS,
    );
  }

  // Ensure approved keys appear in report even when missing
  for (const key of [
    ...APPROVED_REDDIRT_FALLBACK_KEYS,
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_CAMPAIGN_TIMEZONE",
    "NEXT_PUBLIC_ELECTION_DATE",
    "APP_SESSION_SECRET",
    "INTERNAL_API_SECRET",
    "LOG_LEVEL",
    "ENV_FALLBACK_TO_REDDIRT",
  ]) {
    if (!sources[key]) {
      mark(key, merged[key] ? "process_environment" : "missing");
    }
  }

  cached = {
    env: merged,
    sources,
    redDirtFallbackEnabled,
    redDirtFallbackUsed,
  };
  return cached;
}

export function applyLoadedEnvToProcess(loaded: LoadedEnvironment): void {
  for (const [key, value] of Object.entries(loaded.env)) {
    if (process.env[key] === undefined || process.env[key] === "") {
      if (value !== undefined) process.env[key] = value;
    }
  }
}

export function resetLoadedEnvironmentCache(): void {
  cached = null;
}
