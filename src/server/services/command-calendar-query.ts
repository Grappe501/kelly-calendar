import "server-only";

import { AUTH_STATUS } from "@/server/auth/auth-status";
import { AppError } from "@/lib/security/safe-error";

export type CommandCalendarQueryInput = {
  viewerUserId: string;
  dateStart: string;
  dateEnd: string;
  calendarIds?: string[];
  calendarGroupIds?: string[];
  statuses?: string[];
  countyIds?: string[];
  eventTypes?: string[];
  includeCompleted?: boolean;
  includeCancelled?: boolean;
  savedViewId?: string;
};

/**
 * Command Calendar roll-up query surface.
 * Requires authenticated viewer; returns permission-filtered projections only.
 */
export async function queryCommandCalendar(input: CommandCalendarQueryInput) {
  if (!AUTH_STATUS.authenticationComplete || !input.viewerUserId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage:
        "Command Calendar queries require authentication (Step 4).",
    });
  }

  return {
    events: [] as const,
    conflicts: [] as const,
    rollupMode: "policy_driven",
    liveCalendarDataEnabled: false,
    message: "Authenticated Command Calendar query ready after Step 4 membership resolution.",
  };
}
