export const CALENDAR_PERMISSIONS = [
  "NO_ACCESS",
  "AVAILABILITY_ONLY",
  "VIEW",
  "CONTRIBUTE",
  "EDIT",
  "MANAGE",
  "ADMINISTER",
] as const;

export type CalendarPermission = (typeof CALENDAR_PERMISSIONS)[number];

export const EVENT_SENSITIVITY = [
  "NORMAL",
  "INTERNAL",
  "FUNDRAISING_SENSITIVE",
  "SECURITY_SENSITIVE",
  "PROTECTED_PERSONAL",
] as const;

export type EventSensitivity = (typeof EVENT_SENSITIVITY)[number];

export type ViewerContext = {
  authenticated: boolean;
  systemRole?: string;
  teamIds: string[];
  /** calendarId → permission */
  calendarPermissions: Record<string, CalendarPermission | string>;
};

export type CalendarContext = {
  id: string;
  name: string;
  type: string;
  defaultVisibility: string;
  locationDisclosure: string;
};

export type EventContext = {
  id: string;
  internalTitle: string;
  campaignDisplayTitle?: string;
  restrictedDisplayTitle?: string;
  publicTitle?: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  location?: {
    venue?: string;
    city?: string;
    county?: string;
    region?: string;
    state?: string;
    exactAddress?: string;
  };
  sensitivity: EventSensitivity | string;
  visibilityOverride?: string;
  /** Never delivered to limited viewers — used only to prove sanitization omits them */
  privateNotes?: string;
  donorNames?: string[];
  hostPhone?: string;
  attachmentIds?: string[];
};
