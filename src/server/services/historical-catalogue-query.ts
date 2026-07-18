import "server-only";

import { AUTH_STATUS } from "@/server/auth/auth-status";
import { AppError } from "@/lib/security/safe-error";

export const HISTORICAL_FLOOR = "2025-11-01";

export async function queryHistoricalCatalogue(input: {
  viewerUserId: string;
  since?: string;
  countyId?: string;
  reviewedOnly?: boolean;
}) {
  void input.since;
  void input.countyId;
  void input.reviewedOnly;
  if (!AUTH_STATUS.authenticationComplete) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Historical catalogue queries require Step 4 authentication.",
    });
  }
  return {
    historicalFloor: HISTORICAL_FLOOR,
    events: [] as const,
    distinctions: {
      imported: true,
      manuallyCreated: true,
      reviewed: true,
      unreviewed: true,
      occurredConfirmed: true,
      attendanceConfirmed: true,
    },
  };
}
