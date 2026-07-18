import "server-only";

import {
  getImportRun,
  listImportRecords,
} from "@/server/repositories/historical-import-repository";
import { AUTH_STATUS } from "@/server/auth/auth-status";
import { AppError } from "@/lib/security/safe-error";

export async function getImportRunForOperator(importRunId: string) {
  if (!AUTH_STATUS.authenticationComplete) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Import persistence APIs require Step 4 authentication.",
    });
  }
  return getImportRun(importRunId);
}

export async function getImportRecordsForOperator(importRunId: string) {
  if (!AUTH_STATUS.authenticationComplete) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Import persistence APIs require Step 4 authentication.",
    });
  }
  return listImportRecords(importRunId);
}
