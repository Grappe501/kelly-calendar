/**
 * Centralized Campaign Day Closeout policy and section limits.
 * Timezone comes from getPublicAppConfig().campaignTimezone — not duplicated here.
 */

export type CampaignDayCloseoutConfig = {
  allowedPastDays: number;
  sameDayDebriefExpected: boolean;
  debriefExpectedWithinHours: number | null;
  requireUrgentCarryForwardOwner: boolean;
  requireFirstMissionDepartureTime: boolean;
  requireTomorrowKeyMessage: boolean;
  requireTomorrowStrategicPurpose: boolean;
  allowSignoffWithCriticalBlocker: boolean;
  blockReviewWithActiveExecution: boolean;
  maxSummaryChars: number;
  maxNotesChars: number;
  sectionLimits: {
    todayMissions: number;
    activeExecutions: number;
    debriefReview: number;
    commitments: number;
    immediateFollowUps: number;
    dueToday: number;
    overdue: number;
    leadershipDecisions: number;
    carryForwardSuggestions: number;
    carryForwardItems: number;
    tomorrowMissions: number;
    tomorrowConflicts: number;
  };
};

export const DEFAULT_DAY_CLOSEOUT_CONFIG: CampaignDayCloseoutConfig = {
  allowedPastDays: 14,
  sameDayDebriefExpected: true,
  debriefExpectedWithinHours: 24,
  requireUrgentCarryForwardOwner: true,
  requireFirstMissionDepartureTime: true,
  requireTomorrowKeyMessage: false,
  requireTomorrowStrategicPurpose: false,
  allowSignoffWithCriticalBlocker: false,
  blockReviewWithActiveExecution: true,
  maxSummaryChars: 2000,
  maxNotesChars: 4000,
  sectionLimits: {
    todayMissions: 15,
    activeExecutions: 10,
    debriefReview: 15,
    commitments: 15,
    immediateFollowUps: 15,
    dueToday: 15,
    overdue: 15,
    leadershipDecisions: 10,
    carryForwardSuggestions: 20,
    carryForwardItems: 40,
    tomorrowMissions: 10,
    tomorrowConflicts: 10,
  },
};
