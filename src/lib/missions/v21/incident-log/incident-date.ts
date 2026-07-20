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
  DEFAULT_INCIDENT_LOG_CONFIG,
  type IncidentLogConfig,
} from "@/lib/missions/v21/incident-log/incident-config";

export {
  addDaysToDateKey,
  formatCampaignTime,
  formatFullCampaignDate,
  parseBriefingDateKey,
};

export function assertIncidentDateInRange(
  dateKey: string,
  now: Date,
  timeZone: string,
  config: IncidentLogConfig = DEFAULT_INCIDENT_LOG_CONFIG,
): BriefingDateParseResult {
  const parsed = parseBriefingDateKey(dateKey);
  if (!parsed.ok) return parsed;
  const today = campaignDateKey(now, timeZone);
  const earliest = addDaysToDateKey(today, -config.allowedPastDays);
  const latest = addDaysToDateKey(today, config.allowedFutureDays);
  return dateKey < earliest || dateKey > latest
    ? {
        ok: false,
        error: `Date ${dateKey} is outside the allowed Incident Log board range (${earliest}–${latest}).`,
      }
    : parsed;
}

export const classifyIncidentDay = (
  dateKey: string,
  now: Date,
  timeZone: string,
) => classifyBriefingDay(dateKey, now, timeZone);
