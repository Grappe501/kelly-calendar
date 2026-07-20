import "server-only";

import {
  buildCampaignDayBriefingViewModel,
  campaignDayBounds,
  DEFAULT_DAY_BRIEFING_CONFIG,
  missionIntersectsCampaignDay,
  type CampaignDayBriefingViewModel,
} from "@/lib/missions/v21/day-briefing";
import { addDaysToDateKey } from "@/lib/missions/v21/day-briefing/briefing-date";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";

/**
 * Campaign Day Briefing service (V2.1 Deliverable 8).
 * Read-only derived packet. Does not mutate Mission, Event, or phase records.
 * Callers must validate dateKey with assertBriefingDateInRange before invoking.
 */
export async function getCampaignDayBriefing(options: {
  dateKey?: string;
  now?: Date;
}): Promise<CampaignDayBriefingViewModel> {
  const config = DEFAULT_DAY_BRIEFING_CONFIG;
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const todayKey = campaignDateKey(now, campaignTimezone);
  const dateKey = options.dateKey ?? todayKey;

  const { start, end } = campaignDayBounds(dateKey, campaignTimezone);
  const tomorrowKey = addDaysToDateKey(dateKey, 1);
  const tomorrowBounds = campaignDayBounds(tomorrowKey, campaignTimezone);
  const lookbackStart = new Date(
    start.getTime() - config.allowedPastDays * 86_400_000,
  );

  // One bounded query covering briefing day + tomorrow + operational unresolved work
  const rangeStart =
    start.getTime() < tomorrowBounds.start.getTime()
      ? start
      : tomorrowBounds.start;
  const rangeEnd =
    end.getTime() > tomorrowBounds.end.getTime()
      ? end
      : tomorrowBounds.end;

  const all = await loadMissionsForDayBriefing({
    rangeStart,
    rangeEnd,
    operationalLookbackStart: lookbackStart,
    now,
  });

  const dayMissions = all.filter((m) =>
    missionIntersectsCampaignDay(m.startsAt, m.endsAt, dateKey, campaignTimezone),
  );
  const tomorrowMissions = all.filter((m) =>
    missionIntersectsCampaignDay(
      m.startsAt,
      m.endsAt,
      tomorrowKey,
      campaignTimezone,
    ),
  );
  const operationalMissions = all.filter(
    (m) =>
      m.followUp.actions.length > 0 ||
      m.followUp.status === "READY_TO_CLOSE" ||
      m.debrief.status === "COMPLETED" ||
      m.debrief.status === "IN_PROGRESS" ||
      m.debrief.status === "NOT_STARTED",
  );

  return buildCampaignDayBriefingViewModel({
    briefingDate: dateKey,
    now,
    campaignTimezone,
    dayMissions,
    selectorMissions: all,
    operationalMissions,
    tomorrowMissions,
    config,
  });
}
