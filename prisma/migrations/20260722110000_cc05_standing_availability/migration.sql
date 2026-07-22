-- CC-05 Standing Availability Inputs

CREATE TYPE "kelly_calendar"."CalendarAvailabilitySubjectType" AS ENUM (
  'CANDIDATE',
  'CAMPAIGN',
  'CAMPAIGN_USER'
);

CREATE TYPE "kelly_calendar"."CalendarAvailabilityRuleType" AS ENUM (
  'GENERAL_AVAILABILITY',
  'PREFERRED_WINDOW',
  'UNAVAILABLE_WINDOW',
  'PROTECTED_WORK',
  'OFFICE_HOURS',
  'TRAVEL_BUFFER',
  'PREPARATION_BUFFER',
  'RECOVERY_BUFFER',
  'VACATION',
  'BLACKOUT',
  'OTHER'
);

CREATE TYPE "kelly_calendar"."CalendarAvailabilityClassification" AS ENUM (
  'AVAILABLE',
  'PREFERRED',
  'CONSTRAINED',
  'UNAVAILABLE',
  'UNKNOWN',
  'REQUIRES_REVIEW'
);

CREATE TYPE "kelly_calendar"."CalendarAvailabilityApprovalState" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'SUPERSEDED',
  'CANCELLED'
);

CREATE TYPE "kelly_calendar"."CalendarAvailabilityAckDisposition" AS ENUM (
  'ACKNOWLEDGED',
  'ACCEPTED_RISK',
  'RESOLVED',
  'NOT_APPLICABLE'
);

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarAvailabilityRule" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "subjectType" "kelly_calendar"."CalendarAvailabilitySubjectType" NOT NULL DEFAULT 'CANDIDATE',
  "subjectUserId" TEXT,
  "ruleType" "kelly_calendar"."CalendarAvailabilityRuleType" NOT NULL,
  "classification" "kelly_calendar"."CalendarAvailabilityClassification" NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "effectiveStartDate" TEXT NOT NULL,
  "effectiveEndDate" TEXT,
  "startLocalTime" TEXT,
  "endLocalTime" TEXT,
  "weekdays" INTEGER[],
  "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 50,
  "approvalState" "kelly_calendar"."CalendarAvailabilityApprovalState" NOT NULL DEFAULT 'DRAFT',
  "ruleFingerprint" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "reasonSensitive" TEXT,
  "locationHint" TEXT,
  "visibilityNote" TEXT,
  "source" TEXT NOT NULL DEFAULT 'OPERATOR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),
  CONSTRAINT "CalendarAvailabilityRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarAvailabilityRule_campaign_active_idx"
  ON "kelly_calendar"."CalendarAvailabilityRule"("campaignKey", "approvalState", "isActive");
CREATE INDEX IF NOT EXISTS "CalendarAvailabilityRule_fingerprint_idx"
  ON "kelly_calendar"."CalendarAvailabilityRule"("ruleFingerprint");
CREATE INDEX IF NOT EXISTS "CalendarAvailabilityRule_subject_idx"
  ON "kelly_calendar"."CalendarAvailabilityRule"("subjectType", "subjectUserId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarAvailabilityException" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "ruleId" TEXT,
  "subjectType" "kelly_calendar"."CalendarAvailabilitySubjectType" NOT NULL DEFAULT 'CANDIDATE',
  "subjectUserId" TEXT,
  "startDate" TEXT NOT NULL,
  "endDateExclusive" TEXT NOT NULL,
  "startLocalTime" TEXT,
  "endLocalTime" TEXT,
  "isAllDay" BOOLEAN NOT NULL DEFAULT true,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "classification" "kelly_calendar"."CalendarAvailabilityClassification" NOT NULL,
  "label" TEXT NOT NULL,
  "reasonSensitive" TEXT,
  "source" TEXT NOT NULL DEFAULT 'OPERATOR',
  "approvalState" "kelly_calendar"."CalendarAvailabilityApprovalState" NOT NULL DEFAULT 'DRAFT',
  "exceptionFingerprint" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "CalendarAvailabilityException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarAvailabilityException_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "kelly_calendar"."CalendarAvailabilityRule"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CalendarAvailabilityException_campaign_active_idx"
  ON "kelly_calendar"."CalendarAvailabilityException"("campaignKey", "isActive", "approvalState");
CREATE INDEX IF NOT EXISTS "CalendarAvailabilityException_dates_idx"
  ON "kelly_calendar"."CalendarAvailabilityException"("startDate", "endDateExclusive");
CREATE INDEX IF NOT EXISTS "CalendarAvailabilityException_ruleId_idx"
  ON "kelly_calendar"."CalendarAvailabilityException"("ruleId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarAvailabilityAcknowledgement" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "eventId" TEXT,
  "findingKey" TEXT NOT NULL,
  "disposition" "kelly_calendar"."CalendarAvailabilityAckDisposition" NOT NULL,
  "reason" TEXT,
  "evaluationFingerprint" TEXT NOT NULL,
  "ruleSetFingerprint" TEXT NOT NULL,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarAvailabilityAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarAvailabilityAcknowledgement_event_finding_idx"
  ON "kelly_calendar"."CalendarAvailabilityAcknowledgement"("eventId", "findingKey");
CREATE INDEX IF NOT EXISTS "CalendarAvailabilityAcknowledgement_eval_idx"
  ON "kelly_calendar"."CalendarAvailabilityAcknowledgement"("evaluationFingerprint");
