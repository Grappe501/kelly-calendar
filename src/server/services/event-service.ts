import "server-only";

import { getEventById } from "@/server/repositories/event-repository";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";
import { AppError } from "@/lib/security/safe-error";

export async function getSafeEventForViewer(input: {
  eventId: string;
  viewerUserId?: string | null;
  requestedSections?: string[];
  requestContext?: { requestId?: string };
  viewerAccess?: "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL";
}) {
  void input.requestedSections;
  void input.requestContext;
  if (!input.viewerUserId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Authentication is required to view protected calendar events.",
    });
  }

  const row = await getEventById(input.eventId);
  if (!row) {
    throw new AppError({
      code: "NOT_FOUND",
      status: 404,
      publicMessage: "Event not found.",
    });
  }

  return projectSafeEvent({
    event: row,
    calendar: row.primaryCalendar,
    viewerAccess: input.viewerAccess ?? "VIEW_LIMITED",
  });
}

const gated =
  (action: string) =>
  async (input?: unknown) => {
    void input;
    requireAuthorizedMutation(action);
  };

export const createEvent = gated("createEvent");
export const updateEvent = gated("updateEvent");
export const archiveEvent = gated("archiveEvent");
export const restoreEvent = gated("restoreEvent");
export const changePrimaryCalendar = gated("changePrimaryCalendar");
export const addEventCalendarMembership = gated("addEventCalendarMembership");
export const removeEventCalendarMembership = gated("removeEventCalendarMembership");
export const createCanonicalEvent = gated("createCanonicalEvent");
