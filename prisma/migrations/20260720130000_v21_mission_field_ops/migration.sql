-- V2.1 Field Day Operations / Live Kit Confirmation
-- Owned schema: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated field-ops rows.
-- Observations against D12 MissionLogisticsItem; does not rewrite packing/handoff status.

CREATE TYPE "kelly_calendar"."MissionFieldOpsSessionStatus" AS ENUM (
  'OPEN', 'CHECKING', 'READY', 'READY_WITH_RISK', 'WRAP_PENDING', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionFieldOpsReadiness" AS ENUM (
  'NOT_ASSESSED', 'READY', 'READY_WITH_ACCEPTED_RISK', 'NOT_READY', 'NOT_REQUIRED', 'WRAP_PENDING'
);

CREATE TYPE "kelly_calendar"."MissionFieldConfirmationState" AS ENUM (
  'PRESENT', 'MISSING', 'DAMAGED', 'SUBSTITUTED', 'NOT_USABLE',
  'NOT_APPLICABLE', 'RETURNED', 'RETURN_MISSING'
);

CREATE TYPE "kelly_calendar"."MissionFieldItemCondition" AS ENUM (
  'GOOD', 'DAMAGED', 'UNKNOWN'
);

CREATE TYPE "kelly_calendar"."MissionFieldOpsIssueType" AS ENUM (
  'NO_PACK', 'NO_SESSION', 'CRITICAL_UNCONFIRMED', 'CRITICAL_MISSING',
  'CRITICAL_DAMAGED', 'CRITICAL_SUBSTITUTED', 'CRITICAL_NOT_USABLE',
  'SUBSTITUTE_UNACCEPTED', 'HANDOFF_INCOMPLETE_AT_CHECK', 'RETURN_OUTSTANDING',
  'RETURN_MISSING', 'RETURN_DAMAGED', 'STALE_AFTER_LOGISTICS_CHANGE',
  'STALE_AFTER_RESCHEDULE', 'STALE_AFTER_TRAVEL_CHANGE',
  'CANCELLED_MISSION_OPEN_SESSION', 'WRONG_CAMPAIGN_DAY', 'OVERNIGHT_WRAP_OPEN',
  'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."MissionFieldOpsAcknowledgementDisposition" AS ENUM (
  'ACKNOWLEDGED', 'ACCEPTED_RISK', 'RESOLVED', 'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."MissionFieldOpsSession" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "status" "kelly_calendar"."MissionFieldOpsSessionStatus" NOT NULL DEFAULT 'OPEN',
  "readinessState" "kelly_calendar"."MissionFieldOpsReadiness" NOT NULL DEFAULT 'NOT_ASSESSED',
  "fieldLeadName" TEXT,
  "fieldLeadUserId" TEXT,
  "locationLabel" TEXT,
  "contextNote" TEXT,
  "checkInAt" TIMESTAMP(3),
  "checkInByUserId" TEXT,
  "readinessConfirmedAt" TIMESTAMP(3),
  "readinessConfirmedByUserId" TEXT,
  "wrapStartedAt" TIMESTAMP(3),
  "wrapStartedByUserId" TEXT,
  "closedAt" TIMESTAMP(3),
  "closedByUserId" TEXT,
  "acceptedRiskSummary" TEXT,
  "internalNotes" TEXT,
  "fieldNotes" TEXT,
  "logisticsFingerprint" TEXT,
  "scheduleFingerprint" TEXT,
  "travelFingerprint" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionFieldOpsSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionFieldOpsSession_missionId_key"
  ON "kelly_calendar"."MissionFieldOpsSession"("missionId");
CREATE INDEX "MissionFieldOpsSession_campaignDateKey_idx"
  ON "kelly_calendar"."MissionFieldOpsSession"("campaignDateKey");
CREATE INDEX "MissionFieldOpsSession_status_idx"
  ON "kelly_calendar"."MissionFieldOpsSession"("status");
CREATE INDEX "MissionFieldOpsSession_readinessState_idx"
  ON "kelly_calendar"."MissionFieldOpsSession"("readinessState");

ALTER TABLE "kelly_calendar"."MissionFieldOpsSession"
  ADD CONSTRAINT "MissionFieldOpsSession_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionFieldItemConfirmation" (
  "id" TEXT NOT NULL,
  "fieldOpsSessionId" TEXT NOT NULL,
  "logisticsItemId" TEXT,
  "itemDescriptionSnapshot" TEXT NOT NULL,
  "itemCriticalitySnapshot" TEXT NOT NULL DEFAULT 'STANDARD',
  "itemReturnRequiredSnapshot" BOOLEAN NOT NULL DEFAULT false,
  "state" "kelly_calendar"."MissionFieldConfirmationState" NOT NULL,
  "observedQuantityLabel" TEXT,
  "condition" "kelly_calendar"."MissionFieldItemCondition" NOT NULL DEFAULT 'UNKNOWN',
  "substituteDescription" TEXT,
  "exceptionNote" TEXT,
  "locationLabel" TEXT,
  "confirmedAt" TIMESTAMP(3) NOT NULL,
  "confirmedByUserId" TEXT,
  "historyJson" JSONB NOT NULL DEFAULT '[]',
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionFieldItemConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionFieldItemConfirmation_fieldOpsSessionId_logisticsItemId_key"
  ON "kelly_calendar"."MissionFieldItemConfirmation"("fieldOpsSessionId", "logisticsItemId");
CREATE INDEX "MissionFieldItemConfirmation_fieldOpsSessionId_idx"
  ON "kelly_calendar"."MissionFieldItemConfirmation"("fieldOpsSessionId");
CREATE INDEX "MissionFieldItemConfirmation_logisticsItemId_idx"
  ON "kelly_calendar"."MissionFieldItemConfirmation"("logisticsItemId");
CREATE INDEX "MissionFieldItemConfirmation_state_idx"
  ON "kelly_calendar"."MissionFieldItemConfirmation"("state");

ALTER TABLE "kelly_calendar"."MissionFieldItemConfirmation"
  ADD CONSTRAINT "MissionFieldItemConfirmation_fieldOpsSessionId_fkey"
  FOREIGN KEY ("fieldOpsSessionId") REFERENCES "kelly_calendar"."MissionFieldOpsSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."MissionFieldItemConfirmation"
  ADD CONSTRAINT "MissionFieldItemConfirmation_logisticsItemId_fkey"
  FOREIGN KEY ("logisticsItemId") REFERENCES "kelly_calendar"."MissionLogisticsItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionFieldOpsAcknowledgement" (
  "id" TEXT NOT NULL,
  "fieldOpsSessionId" TEXT NOT NULL,
  "issueKey" TEXT NOT NULL,
  "issueType" "kelly_calendar"."MissionFieldOpsIssueType" NOT NULL,
  "title" TEXT NOT NULL,
  "disposition" "kelly_calendar"."MissionFieldOpsAcknowledgementDisposition" NOT NULL,
  "note" TEXT,
  "acceptedRiskReason" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionFieldOpsAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionFieldOpsAcknowledgement_fieldOpsSessionId_issueKey_key"
  ON "kelly_calendar"."MissionFieldOpsAcknowledgement"("fieldOpsSessionId", "issueKey");
CREATE INDEX "MissionFieldOpsAcknowledgement_fieldOpsSessionId_disposition_idx"
  ON "kelly_calendar"."MissionFieldOpsAcknowledgement"("fieldOpsSessionId", "disposition");
CREATE INDEX "MissionFieldOpsAcknowledgement_issueType_idx"
  ON "kelly_calendar"."MissionFieldOpsAcknowledgement"("issueType");

ALTER TABLE "kelly_calendar"."MissionFieldOpsAcknowledgement"
  ADD CONSTRAINT "MissionFieldOpsAcknowledgement_fieldOpsSessionId_fkey"
  FOREIGN KEY ("fieldOpsSessionId") REFERENCES "kelly_calendar"."MissionFieldOpsSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
