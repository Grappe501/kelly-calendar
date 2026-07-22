import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import {
  getImportRun,
  listImportRecords,
  listRecentImportRuns,
  listUnreviewedImportRecords,
} from "@/server/repositories/historical-import-repository";
import { NotFoundError } from "@/lib/security/safe-error";

export async function listImportRunsForOperator(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "HISTORICAL_IMPORT_VIEW",
    resource: { type: "system" },
  });
  return listRecentImportRuns(40);
}

export async function getImportRunForOperator(
  actor: AuthenticatedActor,
  importRunId: string,
) {
  await requireAuthorized(actor, {
    action: "HISTORICAL_IMPORT_VIEW",
    resource: { type: "system" },
  });
  const run = await getImportRun(importRunId);
  if (!run) throw new NotFoundError("Import run not found.");
  return run;
}

export async function getImportRecordsForOperator(
  actor: AuthenticatedActor,
  importRunId: string,
) {
  await requireAuthorized(actor, {
    action: "HISTORICAL_IMPORT_VIEW",
    resource: { type: "system" },
  });
  return listImportRecords(importRunId);
}

export async function getUnreviewedImportQueue(actor: AuthenticatedActor) {
  await requireAuthorized(actor, {
    action: "HISTORICAL_IMPORT_VIEW",
    resource: { type: "system" },
  });
  return listUnreviewedImportRecords(50);
}
