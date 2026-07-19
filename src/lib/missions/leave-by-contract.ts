/**
 * Step 6.3 Leave By Engine contract hook.
 * Step 6.2 surfaces the slot only — no travel computation yet.
 */
export type LeaveByComputationStatus = "not_computed" | "computed" | "unavailable";

export type LeaveByHook = {
  status: LeaveByComputationStatus;
  /** ISO timestamp when the operator should leave. Null until 6.3. */
  leaveByAt: string | null;
  driveMinutes: number | null;
  arrivalAt: string | null;
  /** 0–100 confidence when computed. */
  confidence: number | null;
  riskNote: string | null;
  backupRoute: string | null;
};

export function emptyLeaveByHook(
  status: LeaveByComputationStatus = "not_computed",
): LeaveByHook {
  return {
    status,
    leaveByAt: null,
    driveMinutes: null,
    arrivalAt: null,
    confidence: null,
    riskNote: null,
    backupRoute: null,
  };
}
