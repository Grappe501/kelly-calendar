import type {
  CalendarHealthAlertStatus,
  CalendarHealthOverallState,
  DeriveOverallHealthStateInput,
} from "@/lib/calendar/health/types";

/**
 * Derive roll-up overall health state from mandatory domain outcomes + findings.
 *
 * Rules:
 * - HEALTHY only when all mandatory domains completed successfully, none skipped/failed,
 *   not truncated, no critical findings, and config is OK.
 * - Mandatory failure → never HEALTHY (UNHEALTHY).
 * - Skips → PARTIAL (some progress) or UNKNOWN (none completed).
 * - Truncation → PARTIAL (clean otherwise) or DEGRADED (warnings present).
 * - Missing DB → UNKNOWN; missing secret/config → NOT_CONFIGURED.
 * - Never HEALTHY when database/config is failed or missing.
 */
export function deriveOverallHealthState(
  input: DeriveOverallHealthStateInput,
): CalendarHealthOverallState {
  const config = String(input.configState ?? "OK")
    .trim()
    .toUpperCase();

  if (config === "MISSING_DATABASE") {
    return "UNKNOWN";
  }
  if (
    config === "MISSING_SECRET" ||
    config === "NOT_CONFIGURED" ||
    (config.startsWith("MISSING_") && config !== "MISSING_DATABASE")
  ) {
    return "NOT_CONFIGURED";
  }
  if (config !== "OK" && config !== "") {
    // DATABASE_ERROR / FAILED_DATABASE / etc — never healthy
    return "UNHEALTHY";
  }

  if (input.mandatoryFailed > 0) {
    return "UNHEALTHY";
  }

  if (input.mandatorySkipped > 0) {
    return input.mandatoryCompleted > 0 ? "PARTIAL" : "UNKNOWN";
  }

  if (input.criticalFindings > 0) {
    return "UNHEALTHY";
  }

  if (input.truncated) {
    return input.warningFindings > 0 ? "DEGRADED" : "PARTIAL";
  }

  const allMandatoryOk =
    input.mandatoryExpected > 0 &&
    input.mandatoryCompleted === input.mandatoryExpected &&
    input.mandatoryFailed === 0 &&
    input.mandatorySkipped === 0;

  if (!allMandatoryOk) {
    if (input.mandatoryExpected === 0) return "UNKNOWN";
    if (input.mandatoryCompleted < input.mandatoryExpected) return "PARTIAL";
    return "UNKNOWN";
  }

  if (input.warningFindings > 0) {
    return "DEGRADED";
  }

  return "HEALTHY";
}

/**
 * Deterministic finding key for coalescing alerts across runs.
 * Format: `{domain}:{type}` or `{domain}:{type}:{refId}` (lowercased, trimmed).
 */
export function stableFindingKey(
  domain: string,
  type: string,
  refId?: string | null,
): string {
  const parts = [domain, type, refId ?? ""]
    .map((p) => String(p ?? "").trim().toLowerCase())
    .filter((p, i) => i < 2 || p.length > 0);
  return parts.join(":");
}

/** True when completedAt is missing or older than freshnessMs. */
export function isStale(
  completedAt: Date | string | null | undefined,
  freshnessMs: number,
  now: Date = new Date(),
): boolean {
  if (completedAt == null) return true;
  const ms =
    typeof completedAt === "string"
      ? Date.parse(completedAt)
      : completedAt.getTime();
  if (Number.isNaN(ms)) return true;
  return now.getTime() - ms > freshnessMs;
}

/**
 * ACKNOWLEDGED is an operator disposition, not resolution.
 * Only RESOLVED (and optionally STALE/SUPPRESSED closures) count as closed.
 */
export function isAlertResolved(
  status: CalendarHealthAlertStatus | string,
): boolean {
  return String(status).toUpperCase() === "RESOLVED";
}

/** ACKNOWLEDGED does not equal resolved — alerts remain open for ops tracking. */
export function isAlertStillOpen(
  status: CalendarHealthAlertStatus | string,
): boolean {
  const s = String(status).toUpperCase();
  return s === "OPEN" || s === "ACKNOWLEDGED";
}
