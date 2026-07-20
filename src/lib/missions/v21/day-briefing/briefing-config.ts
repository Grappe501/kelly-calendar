/**
 * Centralized Campaign Day Briefing thresholds and section limits.
 * Timezone comes from getPublicAppConfig().campaignTimezone — not duplicated here.
 */

export type CampaignDayBriefingConfig = {
  allowedPastDays: number;
  allowedFutureDays: number;
  preparationRiskWindowHours: number;
  dueSoonWindowHours: number;
  staleWarningMinutes: number;
  tomorrowPreviewEnabled: boolean;
  sectionLimits: {
    timeline: number;
    preparation: number;
    dueToday: number;
    overdue: number;
    risks: number;
    people: number;
    organizations: number;
    leadershipDecisions: number;
    endOfDay: number;
    missionMessages: number;
    travelLegs: number;
  };
};

export const DEFAULT_DAY_BRIEFING_CONFIG: CampaignDayBriefingConfig = {
  allowedPastDays: 30,
  allowedFutureDays: 90,
  preparationRiskWindowHours: 72,
  dueSoonWindowHours: 24,
  staleWarningMinutes: 15,
  tomorrowPreviewEnabled: true,
  sectionLimits: {
    timeline: 25,
    preparation: 12,
    dueToday: 15,
    overdue: 10,
    risks: 10,
    people: 15,
    organizations: 10,
    leadershipDecisions: 10,
    endOfDay: 10,
    missionMessages: 12,
    travelLegs: 12,
  },
};
