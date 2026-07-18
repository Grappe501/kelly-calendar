/**
 * Browser-safe public config helpers (no filesystem / RedDirt access).
 */
export {
  getPublicEnvironment as getPublicAppConfig,
  tryGetPublicEnvironment,
} from "@/lib/env/public-environment";
export type { PublicEnvironment as PublicAppConfig } from "@/lib/env/types";

export function isTimezoneValid(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isElectionDateValid(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
