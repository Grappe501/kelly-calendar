import "server-only";

import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

/**
 * Transactional import approval — blocked until Step 4 auth.
 * When enabled: approve staged import → canonical event + memberships +
 * external identity + historical review + audit in one transaction.
 */
export async function approveImportRecord(input: {
  importRunId: string;
  recordId: string;
  operatorUserId: string;
  requestId: string;
}) {
  void input;
  requireAuthorizedMutation("approveImportRecord");
}

export async function rejectImportRecord(input: {
  importRunId: string;
  recordId: string;
  operatorUserId: string;
  requestId: string;
}) {
  void input;
  requireAuthorizedMutation("rejectImportRecord");
}

export async function mergeImportRecord(input: {
  importRunId: string;
  recordId: string;
  canonicalEventId: string;
  operatorUserId: string;
  requestId: string;
}) {
  void input;
  requireAuthorizedMutation("mergeImportRecord");
}
