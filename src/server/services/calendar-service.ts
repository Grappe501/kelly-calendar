import "server-only";

import {
  getCalendarById,
  getCommandCalendar,
  listActiveCalendars,
} from "@/server/repositories/calendar-repository";

export async function listCalendarsForReference() {
  return listActiveCalendars();
}

export async function getCalendar(calendarId: string) {
  return getCalendarById(calendarId);
}

export async function getCommandCalendarRecord() {
  return getCommandCalendar();
}
