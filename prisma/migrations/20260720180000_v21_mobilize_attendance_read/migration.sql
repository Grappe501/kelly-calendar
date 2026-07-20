-- V2.1 Mobilize Signup/Attendance Read Integration (D18)
-- Additive. Person-level apply remains application-disabled without consent-aware Person authority.
-- Owned schema: kelly_calendar

CREATE TYPE "kelly_calendar"."MobilizeAttendancePrivacyClass" AS ENUM (
  'AGGREGATE_ONLY', 'IDENTITY_REDACTED', 'MATCH_REVIEW', 'RESTRICTED'
);

CREATE TYPE "kelly_calendar"."ExternalPersonMatchStatus" AS ENUM (
  'UNMATCHED', 'PROPOSED', 'AMBIGUOUS', 'CONFIRMED', 'REJECTED', 'DO_NOT_LINK'
);

CREATE TYPE "kelly_calendar"."ExternalPersonMatchMethod" AS ENUM (
  'EXISTING_EXTERNAL_REF', 'EXACT_EMAIL', 'EXACT_PHONE', 'OPERATOR_SELECTED', 'MULTI_FIELD', 'NAME_ONLY'
);

CREATE TYPE "kelly_calendar"."ExternalPersonMatchConfidence" AS ENUM (
  'HIGH', 'MEDIUM', 'LOW', 'AMBIGUOUS'
);

CREATE TYPE "kelly_calendar"."MissionAttendanceCorrelationStatus" AS ENUM (
  'PROPOSED', 'CONFIRMED', 'CORRECTED', 'REMOVED'
);

CREATE TABLE "kelly_calendar"."MobilizeAttendanceObservation" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL DEFAULT 'MOBILIZE',
  "externalAttendanceId" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "externalTimeslotId" TEXT,
  "externalPersonId" TEXT,
  "localEventId" TEXT,
  "localMissionId" TEXT,
  "remoteStatus" TEXT NOT NULL,
  "statusCategory" TEXT NOT NULL,
  "attendedFlag" BOOLEAN,
  "signupAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "observedAttendedAt" TIMESTAMP(3),
  "remoteModifiedAt" TIMESTAMP(3),
  "contentFingerprint" TEXT NOT NULL,
  "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncRunId" TEXT,
  "privacyClassification" "kelly_calendar"."MobilizeAttendancePrivacyClass" NOT NULL DEFAULT 'AGGREGATE_ONLY',
  "remoteDeletedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobilizeAttendanceObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobilizeAttendanceObservation_campaignScopeKey_provider_externalAttendanceId_key"
  ON "kelly_calendar"."MobilizeAttendanceObservation"("campaignScopeKey", "provider", "externalAttendanceId");
CREATE INDEX "MobilizeAttendanceObservation_externalEventId_externalTimeslotId_idx"
  ON "kelly_calendar"."MobilizeAttendanceObservation"("externalEventId", "externalTimeslotId");
CREATE INDEX "MobilizeAttendanceObservation_localEventId_idx"
  ON "kelly_calendar"."MobilizeAttendanceObservation"("localEventId");
CREATE INDEX "MobilizeAttendanceObservation_localMissionId_idx"
  ON "kelly_calendar"."MobilizeAttendanceObservation"("localMissionId");
CREATE INDEX "MobilizeAttendanceObservation_statusCategory_isActive_idx"
  ON "kelly_calendar"."MobilizeAttendanceObservation"("statusCategory", "isActive");
CREATE INDEX "MobilizeAttendanceObservation_lastSyncRunId_idx"
  ON "kelly_calendar"."MobilizeAttendanceObservation"("lastSyncRunId");

CREATE TABLE "kelly_calendar"."ExternalPersonMatch" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL DEFAULT 'MOBILIZE',
  "externalPersonId" TEXT NOT NULL,
  "proposedLocalPersonId" TEXT,
  "matchMethod" "kelly_calendar"."ExternalPersonMatchMethod" NOT NULL,
  "confidenceCategory" "kelly_calendar"."ExternalPersonMatchConfidence" NOT NULL,
  "status" "kelly_calendar"."ExternalPersonMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "conflictReason" TEXT,
  "provenanceSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalPersonMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalPersonMatch_campaignScopeKey_provider_externalPersonId_key"
  ON "kelly_calendar"."ExternalPersonMatch"("campaignScopeKey", "provider", "externalPersonId");
CREATE INDEX "ExternalPersonMatch_status_idx" ON "kelly_calendar"."ExternalPersonMatch"("status");
CREATE INDEX "ExternalPersonMatch_proposedLocalPersonId_idx"
  ON "kelly_calendar"."ExternalPersonMatch"("proposedLocalPersonId");

CREATE TABLE "kelly_calendar"."MissionAttendanceCorrelation" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "missionId" TEXT NOT NULL,
  "localCheckInObjectType" TEXT NOT NULL,
  "localCheckInObjectId" TEXT NOT NULL,
  "attendanceObservationId" TEXT NOT NULL,
  "status" "kelly_calendar"."MissionAttendanceCorrelationStatus" NOT NULL DEFAULT 'PROPOSED',
  "correlationReason" TEXT,
  "confirmedByUserId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "correctedFromCorrelationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionAttendanceCorrelation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionAttendanceCorrelation_missionId_status_idx"
  ON "kelly_calendar"."MissionAttendanceCorrelation"("missionId", "status");
CREATE INDEX "MissionAttendanceCorrelation_attendanceObservationId_idx"
  ON "kelly_calendar"."MissionAttendanceCorrelation"("attendanceObservationId");
CREATE INDEX "MissionAttendanceCorrelation_localCheckInObjectType_localCheckInObjectId_idx"
  ON "kelly_calendar"."MissionAttendanceCorrelation"("localCheckInObjectType", "localCheckInObjectId");

ALTER TABLE "kelly_calendar"."MissionAttendanceCorrelation"
  ADD CONSTRAINT "MissionAttendanceCorrelation_attendanceObservationId_fkey"
  FOREIGN KEY ("attendanceObservationId") REFERENCES "kelly_calendar"."MobilizeAttendanceObservation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
