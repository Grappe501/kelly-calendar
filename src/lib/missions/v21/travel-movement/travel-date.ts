import {
  addDaysToDateKey,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
  type BriefingDateParseResult,
} from "@/lib/missions/v21/day-briefing/briefing-date";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import {
  DEFAULT_TRAVEL_MOVEMENT_CONFIG,
  type TravelMovementConfig,
} from "@/lib/missions/v21/travel-movement/travel-config";
import { classifyBriefingDay } from "@/lib/missions/v21/day-briefing/briefing-date";

export {
  addDaysToDateKey,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
};

/** Day movement board: past window + limited future for planning. */
export function assertMovementDateInRange(
  dateKey: string,
  now: Date,
  timeZone: string,
  config: TravelMovementConfig = DEFAULT_TRAVEL_MOVEMENT_CONFIG,
): BriefingDateParseResult {
  const parsed = parseBriefingDateKey(dateKey);
  if (!parsed.ok) return parsed;
  const today = campaignDateKey(now, timeZone);
  const earliest = addDaysToDateKey(today, -config.allowedPastDays);
  const latest = addDaysToDateKey(today, config.allowedFutureDays);
  if (dateKey < earliest || dateKey > latest) {
    return {
      ok: false,
      error: `Date ${dateKey} is outside the allowed movement board range (${earliest}–${latest}).`,
    };
  }
  return parsed;
}

export function classifyMovementDay(
  dateKey: string,
  now: Date,
  timeZone: string,
) {
  return classifyBriefingDay(dateKey, now, timeZone);
}
