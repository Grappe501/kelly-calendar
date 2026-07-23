/**
 * IC-02B Mission Activation — types & constants.
 * Activation plans are independent of Mission lifecycle (ADR-106).
 */

export const ACTIVATION_BUILD_ID =
  "KCCC-IC-02B-MISSION-ACTIVATION-PLAYBOOKS-1.0" as const;
export const ACTIVATION_CAMPAIGN_SCOPE = "KELLY" as const;
export const STANDARD_TEMPLATE_CODE = "STANDARD_EVENT_ACTIVATION" as const;
export const STANDARD_TEMPLATE_VERSION = "1.0.0" as const;

export type PlaybookLevel =
  | "NONE"
  | "MINIMAL"
  | "STANDARD"
  | "MAJOR"
  | "CUSTOM";

export type TimingAnchor =
  | "EVENT_CREATED"
  | "MISSION_CREATED"
  | "ACTIVATION_APPLIED"
  | "EVENT_START"
  | "EVENT_END"
  | "WEEKEND_BEFORE_EVENT"
  | "CUSTOM";

export type WindowLabel =
  | "DUE_IMMEDIATELY"
  | "MISSED_WINDOW"
  | "NOT_APPLICABLE"
  | "OPERATOR_REVIEW"
  | "ON_SCHEDULE";

export type DepartmentCode =
  | "EVENTS"
  | "COMMUNICATIONS"
  | "GRAPHICS"
  | "SOCIAL_MEDIA"
  | "DIGITAL"
  | "PRESS"
  | "FIELD_CANVASS"
  | "PHONE_BANK"
  | "TEXTING"
  | "VOLUNTEER_MANAGEMENT"
  | "FUNDRAISING"
  | "LOGISTICS"
  | "TRAVEL"
  | "LODGING"
  | "DINING"
  | "MATERIALS"
  | "CANDIDATE"
  | "LEADERSHIP";

export type WorkstreamCode =
  | "EVENT_MANAGEMENT"
  | "COMMUNICATIONS"
  | "EMAIL"
  | "SMS_TEXTING"
  | "PHONE_BANK"
  | "VOLUNTEER_RECRUITMENT"
  | "DOOR_HANGER_CANVASSING"
  | "CANDIDATE_CANVASSING"
  | "SOCIAL_MEDIA"
  | "GRAPHIC_DESIGN"
  | "DIGITAL_ADVERTISING"
  | "ARKANSAS_PRESS_ASSOCIATION"
  | "RADIO"
  | "NEWSPAPER"
  | "HOSTS_AND_PARTNERS"
  | "LOGISTICS"
  | "TRAVEL"
  | "LODGING"
  | "DINING"
  | "MATERIALS"
  | "FUNDRAISING_SUPPORT"
  | "FOLLOW_UP";

export type TemplateStepDef = {
  stepKey: string;
  department: DepartmentCode;
  workstream: WorkstreamCode;
  title: string;
  instructions?: string;
  timingAnchor: TimingAnchor;
  /** Hours relative to anchor. Negative = before anchor. */
  offsetHours: number;
  defaultPriority?: string;
  required?: boolean;
  blockingDependencyKeys?: string[];
  requiresConsent?: boolean;
  requiresContentApproval?: boolean;
  requiresAudienceApproval?: boolean;
  requiresExternalProvider?: boolean;
  volunteerEligible?: boolean;
  requiresGeographyRadius?: boolean;
  requiresCompletionProof?: boolean;
  sortOrder?: number;
  createVolunteerNeed?: boolean;
};

export type ScheduleContext = {
  eventCreatedAt: Date;
  missionCreatedAt: Date;
  activationAppliedAt: Date;
  eventStartsAt: Date;
  eventEndsAt: Date;
  timezone: string;
  isAllDay: boolean;
};

export type PreviewTask = {
  stepKey: string;
  department: DepartmentCode;
  workstream: WorkstreamCode;
  title: string;
  instructions?: string;
  timingAnchor: TimingAnchor;
  dueAt: Date | null;
  windowLabel: WindowLabel;
  required: boolean;
  requiresConsent: boolean;
  requiresContentApproval: boolean;
  requiresAudienceApproval: boolean;
  requiresExternalProvider: boolean;
  volunteerEligible: boolean;
  createVolunteerNeed: boolean;
  /** Hard rule: never auto-send / publish / purchase */
  externalActionBlocked: true;
};
