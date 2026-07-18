import type { VisibilityLevel } from "@/lib/calendar-security/visibility-levels";

export type SafeCalendarEventView = {
  eventId: string;
  calendarId: string;
  calendarName: string;
  calendarType: string;
  visibilityLevel: Exclude<VisibilityLevel, "HIDDEN_FROM_UNAUTHENTICATED">;
  title: string;
  locationLabel?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  status: "TENTATIVE" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  canOpen: boolean;
  canEdit: boolean;
  canViewPeople: boolean;
  canViewNotes: boolean;
  canViewTravelDetails: boolean;
  canViewFiles: boolean;
  canViewCommunications: boolean;
  protectedFieldsOmitted: boolean;
  limitedAccessLabel?: string;
};
