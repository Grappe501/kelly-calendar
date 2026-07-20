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
  DEFAULT_DAY_LAUNCH_CONFIG,
  type CampaignDayLaunchConfig,
} from "@/lib/missions/v21/day-launch/launch-config";

export {
  addDaysToDateKey,
  campaignDayBounds,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
};

/** Launch Review: today + recent past only — never future. */
export function assertLaunchDateInRange(
  dateKey: string,
  now: Date,
  timeZone: string,
  config: CampaignDayLaunchConfig = DEFAULT_DAY_LAUNCH_CONFIG,
): BriefingDateParseResult {
  const parsed = parseBriefingDateKey(dateKey);
  if (!parsed.ok) return parsed;
  const today = campaignDateKey(now, timeZone);
  if (dateKey > today) {
    return {
      ok: false,
      error: `Date ${dateKey} is in the future. Launch Review supports today through the previous ${config.allowedPastDays} days only.`,
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

export function classifyLaunchDay(
  dateKey: string,
  now: Date,
  timeZone: string,
): { isToday: boolean; isPast: boolean; isFuture: boolean } {
  return classifyBriefingDay(dateKey, now, timeZone);
}

export function launchDayHeading(
  dateKey: string,
  now: Date,
  timeZone: string,
): string {
  const { isToday } = classifyLaunchDay(dateKey, now, timeZone);
  const label = formatFullCampaignDate(dateKey, timeZone);
  return isToday
    ? `Morning Launch Review for ${label}`
    : `Morning Launch Review for historical day ${label}`;
}
