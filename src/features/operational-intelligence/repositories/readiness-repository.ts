export type ReadinessSnapshotWrite = {
  eventId: string;
  eventVersion: number;
  calculationVersion: string;
  overallScore: number;
  readinessLevel: string;
  domainScores: unknown;
  criticalBlockers: unknown;
};

/** Snapshot writes require authenticated mutation path (Step 4). */
export async function persistReadinessSnapshot(
  _input: ReadinessSnapshotWrite,
): Promise<{ ok: false; code: "AUTHENTICATION_REQUIRED" }> {
  void _input;
  return { ok: false, code: "AUTHENTICATION_REQUIRED" };
}
