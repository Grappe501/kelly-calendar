export type ApprovalBinding = {
  eventId: string;
  actionType: "CREATE" | "UPDATE" | "DELETE";
  mappingVersion: string;
  localFingerprint: string;
  payloadFingerprint: string;
  targetOrganizationId: string;
  approvedByUserId: string;
  approvedAt: string;
  expiresAt: string | null;
};

export type ApprovalValidationInput = {
  approval: ApprovalBinding & {
    state: "ACTIVE" | "CONSUMED" | "EXPIRED" | "SUPERSEDED" | "REVOKED";
  };
  currentLocalFingerprint: string;
  currentPayloadFingerprint: string;
  currentMappingVersion: string;
  currentOrganizationId: string;
  now?: Date;
};

export type ApprovalValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validatePublicationApproval(
  input: ApprovalValidationInput,
): ApprovalValidationResult {
  const now = input.now ?? new Date();
  if (input.approval.state !== "ACTIVE") {
    return {
      ok: false,
      code: "APPROVAL_NOT_ACTIVE",
      message: `Approval state is ${input.approval.state}.`,
    };
  }
  if (
    input.approval.expiresAt &&
    new Date(input.approval.expiresAt).getTime() < now.getTime()
  ) {
    return {
      ok: false,
      code: "APPROVAL_EXPIRED",
      message: "Approval has expired — generate a new preview and approval.",
    };
  }
  if (input.approval.localFingerprint !== input.currentLocalFingerprint) {
    return {
      ok: false,
      code: "LOCAL_FINGERPRINT_STALE",
      message: "Event changed after approval — new preview required.",
    };
  }
  if (input.approval.payloadFingerprint !== input.currentPayloadFingerprint) {
    return {
      ok: false,
      code: "PAYLOAD_FINGERPRINT_STALE",
      message: "Proposed payload changed after approval.",
    };
  }
  if (input.approval.mappingVersion !== input.currentMappingVersion) {
    return {
      ok: false,
      code: "MAPPING_VERSION_MISMATCH",
      message: "Mapping version changed after approval.",
    };
  }
  if (input.approval.targetOrganizationId !== input.currentOrganizationId) {
    return {
      ok: false,
      code: "ORG_CHANGED",
      message: "Target organization changed after approval.",
    };
  }
  return { ok: true };
}

/** Idempotency key for create — binds event + payload + org; never reuse across events. */
export function buildCreateIdempotencyKey(input: {
  eventId: string;
  payloadFingerprint: string;
  organizationId: string;
  mappingVersion: string;
}): string {
  return `mobilize-create:${input.organizationId}:${input.eventId}:${input.mappingVersion}:${input.payloadFingerprint}`;
}

export function buildUpdateIdempotencyKey(input: {
  eventId: string;
  remoteEventId: string;
  payloadFingerprint: string;
  organizationId: string;
  baseFingerprint: string;
}): string {
  return `mobilize-update:${input.organizationId}:${input.eventId}:${input.remoteEventId}:${input.baseFingerprint}:${input.payloadFingerprint}`;
}

export type RemoteWriteOutcome =
  | { kind: "SUCCESS"; remoteObjectId: string }
  | { kind: "FAILED"; category: string; message: string }
  | { kind: "UNKNOWN_REMOTE_OUTCOME"; category: string; message: string };

/**
 * Classify transport results for create. Timeout / network after send → UNKNOWN.
 * Never treat unknown as success. Never fabricate remote ids.
 */
export function classifyCreateOutcome(input: {
  errorCategory?: string | null;
  remoteObjectId?: string | null;
  malformedSuccess?: boolean;
}): RemoteWriteOutcome {
  if (input.malformedSuccess) {
    return {
      kind: "FAILED",
      category: "PARSE",
      message: "Success response lacked a valid remote event id.",
    };
  }
  if (input.remoteObjectId) {
    return { kind: "SUCCESS", remoteObjectId: input.remoteObjectId };
  }
  if (
    input.errorCategory === "TIMEOUT" ||
    input.errorCategory === "NETWORK" ||
    input.errorCategory === "UNAVAILABLE"
  ) {
    return {
      kind: "UNKNOWN_REMOTE_OUTCOME",
      category: input.errorCategory,
      message:
        "Remote outcome unknown — reconcile before any create retry. Do not blind-retry.",
    };
  }
  return {
    kind: "FAILED",
    category: input.errorCategory ?? "UNKNOWN",
    message: "Remote create failed.",
  };
}
