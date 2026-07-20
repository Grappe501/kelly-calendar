/**
 * Centralized Travel and Movement Operations policy.
 * Timezone comes from getPublicAppConfig().campaignTimezone.
 */

export type TravelMovementConfig = {
  allowedPastDays: number;
  allowedFutureDays: number;
  minBufferMinutesWhenRequired: number | null;
  requireDestinationWhenMovementRequired: boolean;
  maxSummaryChars: number;
  maxNotesChars: number;
  maxLegs: number;
  sectionLimits: {
    findings: number;
    dayMissions: number;
  };
};

export const DEFAULT_TRAVEL_MOVEMENT_CONFIG: TravelMovementConfig = {
  allowedPastDays: 14,
  allowedFutureDays: 30,
  /** null = missing buffer is informational only, never an automatic blocker */
  minBufferMinutesWhenRequired: null,
  requireDestinationWhenMovementRequired: true,
  maxSummaryChars: 1500,
  maxNotesChars: 4000,
  maxLegs: 12,
  sectionLimits: {
    findings: 20,
    dayMissions: 40,
  },
};
