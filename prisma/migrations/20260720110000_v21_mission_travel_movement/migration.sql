-- V2.1 Travel and Movement Operations — MissionTravelPlan / Leg / Acknowledgement
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated travel rows.

CREATE TYPE "kelly_calendar"."MissionTravelPlanStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'READY',
  'NEEDS_REVIEW',
  'INACTIVE',
  'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionTravelReadiness" AS ENUM (
  'NOT_ASSESSED',
  'READY',
  'READY_WITH_ACCEPTED_RISK',
  'NOT_READY',
  'NOT_REQUIRED'
);

CREATE TYPE "kelly_calendar"."MissionTravelMode" AS ENUM (
  'UNSPECIFIED',
  'DRIVE',
  'WALK',
  'FLIGHT',
  'OTHER'
);

CREATE TYPE "kelly_calendar"."MissionTravelLegStatus" AS ENUM (
  'PLANNED',
  'CONFIRMED',
  'SKIPPED',
  'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionTravelIssueType" AS ENUM (
  'NO_PLAN',
  'MISSING_DEPARTURE',
  'MISSING_DESTINATION',
  'MISSING_DRIVER',
  'MISSING_VEHICLE',
  'ARRIVAL_AFTER_MISSION_START',
  'TIME_CONFLICT',
  'LEG_INCOMPLETE',
  'LEG_ORDER',
  'MOVEMENT_OVERLAP',
  'MISSING_BUFFER',
  'STALE_AFTER_RESCHEDULE',
  'CANCELLED_MISSION_ACTIVE_PLAN',
  'CROSS_MIDNIGHT_AMBIGUITY',
  'PREP_INCOMPLETE',
  'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."MissionTravelAcknowledgementDisposition" AS ENUM (
  'ACKNOWLEDGED',
  'ACCEPTED_RISK',
  'RESOLVED',
  'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."MissionTravelPlan" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "status" "kelly_calendar"."MissionTravelPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "readinessState" "kelly_calendar"."MissionTravelReadiness" NOT NULL DEFAULT 'NOT_ASSESSED',
  "movementRequired" BOOLEAN,
  "plannedReadyAt" TIMESTAMP(3),
  "plannedDepartureAt" TIMESTAMP(3),
  "requiredArrivalAt" TIMESTAMP(3),
  "bufferMinutes" INTEGER,
  "driverRequired" BOOLEAN NOT NULL DEFAULT false,
  "vehicleRequired" BOOLEAN NOT NULL DEFAULT false,
  "driverName" TEXT,
  "driverUserId" TEXT,
  "vehicleDescription" TEXT,
  "passengerNotes" TEXT,
  "accessibilityNotes" TEXT,
  "securityNotes" TEXT,
  "logisticsNotes" TEXT,
  "acceptedRiskSummary" TEXT,
  "internalNotes" TEXT,
  "scheduleFingerprint" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionTravelPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionTravelPlan_missionId_key"
  ON "kelly_calendar"."MissionTravelPlan"("missionId");

CREATE INDEX "MissionTravelPlan_campaignDateKey_idx"
  ON "kelly_calendar"."MissionTravelPlan"("campaignDateKey");

CREATE INDEX "MissionTravelPlan_status_idx"
  ON "kelly_calendar"."MissionTravelPlan"("status");

CREATE INDEX "MissionTravelPlan_readinessState_idx"
  ON "kelly_calendar"."MissionTravelPlan"("readinessState");

ALTER TABLE "kelly_calendar"."MissionTravelPlan"
  ADD CONSTRAINT "MissionTravelPlan_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionTravelLeg" (
  "id" TEXT NOT NULL,
  "travelPlanId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "originLabel" TEXT,
  "destinationLabel" TEXT,
  "plannedDepartureAt" TIMESTAMP(3),
  "plannedArrivalAt" TIMESTAMP(3),
  "mode" "kelly_calendar"."MissionTravelMode" NOT NULL DEFAULT 'UNSPECIFIED',
  "driverName" TEXT,
  "vehicleDescription" TEXT,
  "bufferMinutes" INTEGER,
  "instructions" TEXT,
  "status" "kelly_calendar"."MissionTravelLegStatus" NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionTravelLeg_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionTravelLeg_travelPlanId_sequence_key"
  ON "kelly_calendar"."MissionTravelLeg"("travelPlanId", "sequence");

CREATE INDEX "MissionTravelLeg_travelPlanId_idx"
  ON "kelly_calendar"."MissionTravelLeg"("travelPlanId");

ALTER TABLE "kelly_calendar"."MissionTravelLeg"
  ADD CONSTRAINT "MissionTravelLeg_travelPlanId_fkey"
  FOREIGN KEY ("travelPlanId") REFERENCES "kelly_calendar"."MissionTravelPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionTravelAcknowledgement" (
  "id" TEXT NOT NULL,
  "travelPlanId" TEXT NOT NULL,
  "issueKey" TEXT NOT NULL,
  "issueType" "kelly_calendar"."MissionTravelIssueType" NOT NULL,
  "title" TEXT NOT NULL,
  "disposition" "kelly_calendar"."MissionTravelAcknowledgementDisposition" NOT NULL,
  "note" TEXT,
  "acceptedRiskReason" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionTravelAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionTravelAcknowledgement_travelPlanId_issueKey_key"
  ON "kelly_calendar"."MissionTravelAcknowledgement"("travelPlanId", "issueKey");

CREATE INDEX "MissionTravelAcknowledgement_travelPlanId_disposition_idx"
  ON "kelly_calendar"."MissionTravelAcknowledgement"("travelPlanId", "disposition");

CREATE INDEX "MissionTravelAcknowledgement_issueType_idx"
  ON "kelly_calendar"."MissionTravelAcknowledgement"("issueType");

ALTER TABLE "kelly_calendar"."MissionTravelAcknowledgement"
  ADD CONSTRAINT "MissionTravelAcknowledgement_travelPlanId_fkey"
  FOREIGN KEY ("travelPlanId") REFERENCES "kelly_calendar"."MissionTravelPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
