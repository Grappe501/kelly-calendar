import {
  addDaysToDateKey,
  campaignDayBounds,
  classifyBriefingDay,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
  type BriefingDateParseResult,
} from "@/lib/missions/v21/day-briefing/briefing-date";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import {
  DEFAULT_DAY_CLOSEOUT_CONFIG,
  type CampaignDayCloseoutConfig,
} from "@/lib/missions/v21/day-closeout/closeout-config";

export {
  addDaysToDateKey,
  campaignDayBounds,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
};

/**
 * Closeout allows today and recent past only — never future dates.
 */
export function assertCloseoutDateInRange(
  dateKey: string,
  now: Date,
  timeZone: string,
  config: CampaignDayCloseoutConfig = DEFAULT_DAY_CLOSEOUT_CONFIG,
): BriefingDateParseResult {
  const parsed = parseBriefingDateKey(dateKey);
  if (!parsed.ok) return parsed;
  const today = campaignDateKey(now, timeZone);
  if (dateKey > today) {
    return {
      ok: false,
      error: `Date ${dateKey} is in the future. Closeout supports today through the previous ${config.allowedPastDays} days only.`,
    };
  }
  const earliest = addDaysToDateKey(today, -config.allowedPastDays);
  if (dateKey < earliest) {
    return {
      ok: false,
      error: `Date ${dateKey} is outside the allowed past range (earliest ${earliest}).`,
    };
  }
  return parsed;
}

export function classifyCloseoutDay(
  dateKey: string,
  now: Date,
  timeZone: string,
): { isToday: boolean; isPast: boolean; isFuture: boolean } {
  return classifyBriefingDay(dateKey, now, timeZone);
}

export function closeoutDayHeading(
  dateKey: string,
  now: Date,
  timeZone: string,
): string {
  const { isToday } = classifyCloseoutDay(dateKey, now, timeZone);
  const label = formatFullCampaignDate(dateKey, timeZone);
  return isToday ? `Closing ${label}` : `Closing historical day ${label}`;
}
