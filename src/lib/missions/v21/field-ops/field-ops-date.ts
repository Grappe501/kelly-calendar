import {
  addDaysToDateKey,
  classifyBriefingDay,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
  type BriefingDateParseResult,
} from "@/lib/missions/v21/day-briefing/briefing-date";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import {
  DEFAULT_FIELD_OPS_CONFIG,
  type FieldOpsConfig,
} from "@/lib/missions/v21/field-ops/field-ops-config";

export {
  addDaysToDateKey,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
};

export function assertFieldOpsDateInRange(
  dateKey: string,
  now: Date,
  timeZone: string,
  config: FieldOpsConfig = DEFAULT_FIELD_OPS_CONFIG,
): BriefingDateParseResult {
  const parsed = parseBriefingDateKey(dateKey);
  if (!parsed.ok) return parsed;
  const today = campaignDateKey(now, timeZone);
  const earliest = addDaysToDateKey(today, -config.allowedPastDays);
  const latest = addDaysToDateKey(today, config.allowedFutureDays);
  return dateKey < earliest || dateKey > latest
    ? {
        ok: false,
        error: `Date ${dateKey} is outside the allowed Field Ops board range (${earliest}–${latest}).`,
      }
    : parsed;
}

export const classifyFieldOpsDay = (
  dateKey: string,
  now: Date,
  timeZone: string,
) => classifyBriefingDay(dateKey, now, timeZone);
