import "server-only";

import { getEventById } from "@/server/repositories/event-repository";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";
import { AppError } from "@/lib/security/safe-error";

export async function getSafeEventForViewer(input: {
  eventId: string;
  viewerUserId?: string | null;
  viewerAccess?: "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL";
}) {
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

export async function createCanonicalEvent() {
  requireAuthorizedMutation("createCanonicalEvent");
}
