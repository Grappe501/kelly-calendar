/**
 * Leave By slot on Mission Cards.
 * Computed by Mission Timeline Engine (6.3); not a standalone fake.
 */
export type LeaveByComputationStatus = "not_computed" | "computed" | "unavailable";

export type LeaveByHook = {
  status: LeaveByComputationStatus;
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
