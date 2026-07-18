export type ConflictActionInput = {
  conflictId: string;
  action: "ACKNOWLEDGED" | "OVERRIDDEN";
  actorUserId: string;
  reason?: string;
};

export async function persistConflictAction(
  _input: ConflictActionInput,
): Promise<{ ok: false; code: "AUTHENTICATION_REQUIRED" }> {
  void _input;
  return { ok: false, code: "AUTHENTICATION_REQUIRED" };
}
