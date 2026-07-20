-- V2.1 Mission Exception / Incident Log
-- Owned schema: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated incident rows.
-- Not emergency dispatch, ticketing, legal, or medical records.

ALTER TYPE "kelly_calendar"."MissionFollowUpSourceType" ADD VALUE IF NOT EXISTS 'MISSION_INCIDENT';

CREATE TYPE "kelly_calendar"."MissionIncidentCategory" AS ENUM (
  'SAFETY', 'ACCESS', 'SECURITY', 'PRESS', 'TRAVEL', 'LOGISTICS',
  'TECHNOLOGY', 'STAFFING', 'SCHEDULE', 'VENUE', 'PUBLIC_INTERACTION', 'OTHER'
);

CREATE TYPE "kelly_calendar"."MissionIncidentSeverity" AS ENUM (
  'INFO', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
);

CREATE TYPE "kelly_calendar"."MissionIncidentStatus" AS ENUM (
  'OPEN', 'MONITORING', 'STABILIZED', 'RESOLVED', 'CLOSED'
);

CREATE TYPE "kelly_calendar"."MissionIncidentSensitivity" AS ENUM (
  'STANDARD', 'RESTRICTED', 'CONFIDENTIAL'
);

CREATE TYPE "kelly_calendar"."MissionIncidentUpdateType" AS ENUM (
  'OBSERVATION', 'ACTION_TAKEN', 'STATUS_CHANGE', 'SEVERITY_CHANGE',
  'HANDOFF', 'RESOLUTION', 'FOLLOW_UP_NOTE', 'CORRECTION'
);

CREATE TYPE "kelly_calendar"."MissionIncidentIssueType" AS ENUM (
  'OPEN_HIGH_CRITICAL', 'EXECUTE_COMPLETED_OPEN', 'STABILIZED_UNRESOLVED',
  'CARRY_FORWARD_REQUIRED', 'FOLLOW_UP_REQUIRED_UNLINKED',
  'CANCELLED_MISSION_ACTIVE', 'UPDATED_AFTER_CLOSEOUT', 'OVERNIGHT_ACTIVE',
  'MISSING_OWNER', 'RESOLUTION_NOTE_MISSING', 'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."MissionIncidentAcknowledgementDisposition" AS ENUM (
  'ACKNOWLEDGED', 'ACCEPTED_RISK', 'RESOLVED', 'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."MissionIncident" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "incidentRef" TEXT NOT NULL,
  "category" "kelly_calendar"."MissionIncidentCategory" NOT NULL DEFAULT 'OTHER',
  "severity" "kelly_calendar"."MissionIncidentSeverity" NOT NULL DEFAULT 'MODERATE',
  "status" "kelly_calendar"."MissionIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "description" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportedByUserId" TEXT,
  "locationLabel" TEXT,
  "sensitivity" "kelly_calendar"."MissionIncidentSensitivity" NOT NULL DEFAULT 'STANDARD',
  "immediateActionSummary" TEXT,
  "ownerName" TEXT,
  "ownerUserId" TEXT,
  "carryForwardRequired" BOOLEAN NOT NULL DEFAULT false,
  "carriedForwardAt" TIMESTAMP(3),
  "carriedForwardByUserId" TEXT,
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "linkedFollowUpActionId" TEXT,
  "linkedFollowUpImportKey" TEXT,
  "stabilizedAt" TIMESTAMP(3),
  "stabilizedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  "closedAt" TIMESTAMP(3),
  "closedByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "archivedByUserId" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionIncident_campaignDateKey_incidentRef_key"
  ON "kelly_calendar"."MissionIncident"("campaignDateKey", "incidentRef");
CREATE INDEX "MissionIncident_missionId_idx"
  ON "kelly_calendar"."MissionIncident"("missionId");
CREATE INDEX "MissionIncident_campaignDateKey_idx"
  ON "kelly_calendar"."MissionIncident"("campaignDateKey");
CREATE INDEX "MissionIncident_status_idx"
  ON "kelly_calendar"."MissionIncident"("status");
CREATE INDEX "MissionIncident_severity_idx"
  ON "kelly_calendar"."MissionIncident"("severity");
CREATE INDEX "MissionIncident_sensitivity_idx"
  ON "kelly_calendar"."MissionIncident"("sensitivity");
CREATE INDEX "MissionIncident_isArchived_idx"
  ON "kelly_calendar"."MissionIncident"("isArchived");

ALTER TABLE "kelly_calendar"."MissionIncident"
  ADD CONSTRAINT "MissionIncident_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionIncidentUpdate" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "updateType" "kelly_calendar"."MissionIncidentUpdateType" NOT NULL,
  "note" TEXT,
  "actionTaken" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByUserId" TEXT,
  "previousStatus" "kelly_calendar"."MissionIncidentStatus",
  "newStatus" "kelly_calendar"."MissionIncidentStatus",
  "previousSeverity" "kelly_calendar"."MissionIncidentSeverity",
  "newSeverity" "kelly_calendar"."MissionIncidentSeverity",
  "sensitivity" "kelly_calendar"."MissionIncidentSensitivity" NOT NULL DEFAULT 'STANDARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MissionIncidentUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionIncidentUpdate_incidentId_idx"
  ON "kelly_calendar"."MissionIncidentUpdate"("incidentId");
CREATE INDEX "MissionIncidentUpdate_occurredAt_recordedAt_id_idx"
  ON "kelly_calendar"."MissionIncidentUpdate"("occurredAt", "recordedAt", "id");
CREATE INDEX "MissionIncidentUpdate_updateType_idx"
  ON "kelly_calendar"."MissionIncidentUpdate"("updateType");

ALTER TABLE "kelly_calendar"."MissionIncidentUpdate"
  ADD CONSTRAINT "MissionIncidentUpdate_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "kelly_calendar"."MissionIncident"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionIncidentAcknowledgement" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "issueKey" TEXT NOT NULL,
  "issueType" "kelly_calendar"."MissionIncidentIssueType" NOT NULL,
  "title" TEXT NOT NULL,
  "disposition" "kelly_calendar"."MissionIncidentAcknowledgementDisposition" NOT NULL,
  "note" TEXT,
  "acceptedRiskReason" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionIncidentAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionIncidentAcknowledgement_incidentId_issueKey_key"
  ON "kelly_calendar"."MissionIncidentAcknowledgement"("incidentId", "issueKey");
CREATE INDEX "MissionIncidentAcknowledgement_incidentId_disposition_idx"
  ON "kelly_calendar"."MissionIncidentAcknowledgement"("incidentId", "disposition");
CREATE INDEX "MissionIncidentAcknowledgement_issueType_idx"
  ON "kelly_calendar"."MissionIncidentAcknowledgement"("issueType");

ALTER TABLE "kelly_calendar"."MissionIncidentAcknowledgement"
  ADD CONSTRAINT "MissionIncidentAcknowledgement_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "kelly_calendar"."MissionIncident"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
