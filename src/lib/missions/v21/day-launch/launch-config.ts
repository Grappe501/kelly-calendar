/**
 * Centralized Morning Launch Review policy and section limits.
 * Timezone comes from getPublicAppConfig().campaignTimezone — not duplicated here.
 */

export type CampaignDayLaunchConfig = {
  allowedPastDays: number;
  requirePriorCloseoutReview: boolean;
  requireFirstMissionKeyMessage: boolean;
  requireFirstMissionStrategicPurpose: boolean;
  requireFirstMissionDepartureTime: boolean;
  requireCriticalCarryForwardOwner: boolean;
  allowLaunchWithAcceptedRisk: boolean;
  morningLaunchCutoffLocalTime: string | null;
  staleReviewMinutes: number;
  maxSummaryChars: number;
  maxNotesChars: number;
  sectionLimits: {
    overnightChanges: number;
    urgentCarryForward: number;
    scheduleIssues: number;
    dueBeforeLaunch: number;
    leadershipDecisions: number;
    blockers: number;
    acknowledgements: number;
  };
};

export const DEFAULT_DAY_LAUNCH_CONFIG: CampaignDayLaunchConfig = {
  allowedPastDays: 7,
  requirePriorCloseoutReview: true,
  requireFirstMissionKeyMessage: false,
  requireFirstMissionStrategicPurpose: false,
  requireFirstMissionDepartureTime: true,
  requireCriticalCarryForwardOwner: true,
  allowLaunchWithAcceptedRisk: true,
  morningLaunchCutoffLocalTime: null,
  staleReviewMinutes: 15,
  maxSummaryChars: 1500,
  maxNotesChars: 4000,
  sectionLimits: {
    overnightChanges: 15,
    urgentCarryForward: 12,
    scheduleIssues: 10,
    dueBeforeLaunch: 12,
    leadershipDecisions: 10,
    blockers: 10,
    acknowledgements: 20,
  },
};
