/**
 * Future Google Calendar API provider contract (OAuth in Step 4+).
 * Step 3 defines the interface only — no live OAuth.
 */

export type GoogleCalendarApiListParams = {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  singleEvents: true;
  orderBy: "startTime";
  pageToken?: string;
  timeZone: "America/Chicago";
  maxResults?: number;
};

export type GoogleCalendarApiProvider = {
  readonly mode: "GOOGLE_API";
  readonly oauthRequired: true;
  readonly implemented: false;
  buildListUrl(params: GoogleCalendarApiListParams): string;
  describeCapabilities(): string[];
};

export const googleCalendarApiProvider: GoogleCalendarApiProvider = {
  mode: "GOOGLE_API",
  oauthRequired: true,
  implemented: false,
  buildListUrl(params) {
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events`;
    const qs = new URLSearchParams({
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      timeZone: params.timeZone,
    });
    if (params.pageToken) qs.set("pageToken", params.pageToken);
    if (params.maxResults) qs.set("maxResults", String(params.maxResults));
    return `${base}?${qs.toString()}`;
  },
  describeCapabilities() {
    return [
      "RFC 3339 timeMin/timeMax bounded listing",
      "singleEvents expansion",
      "orderBy=startTime",
      "pageToken pagination",
      "timeZone=America/Chicago",
      "OAuth read-only scope (future)",
      "OAuth write / push scopes (future — required for KCCC → Google create/update)",
      "Not implemented: secret iCal remains IMPORT_ONLY until OAuth is authorized",
    ];
  },
};
