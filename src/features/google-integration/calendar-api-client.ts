import { GOOGLE_CALENDAR_API_BASE } from "@/features/google-integration/config";
import { AppError } from "@/lib/security/safe-error";

export type GoogleCalendarEvent = {
  id: string;
  iCalUID?: string;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator?: { email?: string; displayName?: string };
  organizer?: { email?: string; displayName?: string };
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurringEventId?: string;
  originalStartTime?: { date?: string; dateTime?: string; timeZone?: string };
  transparency?: string;
  visibility?: string;
  attendees?: Array<{ email?: string; responseStatus?: string; displayName?: string }>;
  hangoutLink?: string;
  conferenceData?: unknown;
  eventType?: string;
};

export type ListEventsResult = {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export async function listGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId: string;
  timeMin?: string;
  timeMax?: string;
  pageToken?: string;
  syncToken?: string;
  showDeleted?: boolean;
}): Promise<ListEventsResult> {
  const params = new URLSearchParams();
  params.set("singleEvents", "true");
  params.set("maxResults", "250");
  params.set("showDeleted", input.showDeleted === false ? "false" : "true");

  if (input.syncToken) {
    params.set("syncToken", input.syncToken);
  } else {
    params.set("orderBy", "startTime");
    if (input.timeMin) params.set("timeMin", input.timeMin);
    if (input.timeMax) params.set("timeMax", input.timeMax);
  }
  if (input.pageToken) params.set("pageToken", input.pageToken);

  const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: "application/json",
    },
  });

  if (res.status === 410) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 409,
      publicMessage: "Google sync token expired. Run a full historical import.",
    });
  }
  if (!res.ok) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: "Google Calendar API request failed.",
    });
  }
  const json = (await res.json()) as {
    items?: GoogleCalendarEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
  };
  return {
    items: json.items ?? [],
    nextPageToken: json.nextPageToken,
    nextSyncToken: json.nextSyncToken,
  };
}

export async function fetchAllGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
}): Promise<{ items: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  const items: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const page = await listGoogleCalendarEvents({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      pageToken,
      showDeleted: true,
    });
    items.push(...page.items);
    pageToken = page.nextPageToken;
    if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
}

export async function incrementalGoogleCalendarSync(input: {
  accessToken: string;
  calendarId: string;
  syncToken: string;
}): Promise<{ items: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  const items: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const page = await listGoogleCalendarEvents({
      accessToken: input.accessToken,
      calendarId: input.calendarId,
      syncToken: input.syncToken,
      pageToken,
      showDeleted: true,
    });
    items.push(...page.items);
    pageToken = page.nextPageToken;
    if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
}
