-- V2.1 Mission Logistics Pack / Field Kit
-- Owned schema: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated logistics rows.

CREATE TYPE "kelly_calendar"."MissionLogisticsPackStatus" AS ENUM (
  'DRAFT', 'ACTIVE', 'READY', 'NEEDS_REVIEW', 'INACTIVE', 'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsReadiness" AS ENUM (
  'NOT_ASSESSED', 'READY', 'READY_WITH_ACCEPTED_RISK', 'NOT_READY', 'NOT_REQUIRED'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsItemCategory" AS ENUM (
  'DOCUMENTS', 'CREDENTIALS', 'SIGNAGE', 'PRINTED_MATERIALS', 'TECHNOLOGY',
  'AUDIO_VISUAL', 'WARDROBE', 'FOOD_WATER', 'ACCESSIBILITY', 'SECURITY',
  'VOLUNTEER_MATERIALS', 'GENERAL_SUPPLIES', 'OTHER'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsItemStatus" AS ENUM (
  'REQUIRED', 'ASSIGNED', 'PACKED', 'HANDED_OFF', 'RECEIVED', 'READY',
  'USED', 'RETURN_PENDING', 'RETURNED', 'NOT_APPLICABLE', 'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsItemCriticality" AS ENUM (
  'CRITICAL', 'STANDARD', 'OPTIONAL'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsHandoffStatus" AS ENUM (
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsIssueType" AS ENUM (
  'NO_PACK', 'CRITICAL_UNASSIGNED', 'CRITICAL_NOT_PACKED', 'DEPARTURE_NOT_READY',
  'HANDOFF_INCOMPLETE', 'HANDOFF_PARTIAL_CONFIRM', 'MISSING_OWNER', 'ITEM_INCOMPLETE',
  'RETURN_OUTSTANDING', 'STALE_AFTER_RESCHEDULE', 'STALE_AFTER_TRAVEL_CHANGE',
  'CANCELLED_MISSION_ACTIVE_PACK', 'WRONG_CAMPAIGN_DAY', 'TIME_CONFLICT',
  'OWNER_OVERLAP', 'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."MissionLogisticsAcknowledgementDisposition" AS ENUM (
  'ACKNOWLEDGED', 'ACCEPTED_RISK', 'RESOLVED', 'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."MissionLogisticsPack" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Field kit',
  "status" "kelly_calendar"."MissionLogisticsPackStatus" NOT NULL DEFAULT 'DRAFT',
  "readinessState" "kelly_calendar"."MissionLogisticsReadiness" NOT NULL DEFAULT 'NOT_ASSESSED',
  "logisticsRequired" BOOLEAN,
  "packOwnerName" TEXT,
  "packOwnerUserId" TEXT,
  "assemblyLocation" TEXT,
  "plannedHandoffAt" TIMESTAMP(3),
  "plannedHandoffLocation" TEXT,
  "relatedTravelPlanId" TEXT,
  "acceptedRiskSummary" TEXT,
  "internalNotes" TEXT,
  "logisticsNotes" TEXT,
  "scheduleFingerprint" TEXT,
  "travelFingerprint" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionLogisticsPack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionLogisticsPack_missionId_key"
  ON "kelly_calendar"."MissionLogisticsPack"("missionId");
CREATE INDEX "MissionLogisticsPack_campaignDateKey_idx"
  ON "kelly_calendar"."MissionLogisticsPack"("campaignDateKey");
CREATE INDEX "MissionLogisticsPack_status_idx"
  ON "kelly_calendar"."MissionLogisticsPack"("status");
CREATE INDEX "MissionLogisticsPack_readinessState_idx"
  ON "kelly_calendar"."MissionLogisticsPack"("readinessState");

ALTER TABLE "kelly_calendar"."MissionLogisticsPack"
  ADD CONSTRAINT "MissionLogisticsPack_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionLogisticsItem" (
  "id" TEXT NOT NULL,
  "logisticsPackId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "category" "kelly_calendar"."MissionLogisticsItemCategory" NOT NULL DEFAULT 'OTHER',
  "description" TEXT NOT NULL,
  "quantityLabel" TEXT,
  "responsibleName" TEXT,
  "responsibleUserId" TEXT,
  "recipientName" TEXT,
  "requiredByAt" TIMESTAMP(3),
  "packLocation" TEXT,
  "status" "kelly_calendar"."MissionLogisticsItemStatus" NOT NULL DEFAULT 'REQUIRED',
  "criticality" "kelly_calendar"."MissionLogisticsItemCriticality" NOT NULL DEFAULT 'STANDARD',
  "returnRequired" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionLogisticsItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionLogisticsItem_logisticsPackId_sequence_key"
  ON "kelly_calendar"."MissionLogisticsItem"("logisticsPackId", "sequence");
CREATE INDEX "MissionLogisticsItem_logisticsPackId_idx"
  ON "kelly_calendar"."MissionLogisticsItem"("logisticsPackId");
CREATE INDEX "MissionLogisticsItem_status_idx"
  ON "kelly_calendar"."MissionLogisticsItem"("status");

ALTER TABLE "kelly_calendar"."MissionLogisticsItem"
  ADD CONSTRAINT "MissionLogisticsItem_logisticsPackId_fkey"
  FOREIGN KEY ("logisticsPackId") REFERENCES "kelly_calendar"."MissionLogisticsPack"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionLogisticsHandoff" (
  "id" TEXT NOT NULL,
  "logisticsPackId" TEXT NOT NULL,
  "logisticsItemId" TEXT,
  "fromName" TEXT,
  "toName" TEXT,
  "plannedAt" TIMESTAMP(3),
  "plannedLocation" TEXT,
  "actualAt" TIMESTAMP(3),
  "actualLocation" TEXT,
  "status" "kelly_calendar"."MissionLogisticsHandoffStatus" NOT NULL DEFAULT 'PLANNED',
  "giverConfirmedAt" TIMESTAMP(3),
  "giverConfirmedByUserId" TEXT,
  "receiverConfirmedAt" TIMESTAMP(3),
  "receiverConfirmedByUserId" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionLogisticsHandoff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionLogisticsHandoff_logisticsPackId_idx"
  ON "kelly_calendar"."MissionLogisticsHandoff"("logisticsPackId");
CREATE INDEX "MissionLogisticsHandoff_logisticsItemId_idx"
  ON "kelly_calendar"."MissionLogisticsHandoff"("logisticsItemId");
CREATE INDEX "MissionLogisticsHandoff_status_idx"
  ON "kelly_calendar"."MissionLogisticsHandoff"("status");

ALTER TABLE "kelly_calendar"."MissionLogisticsHandoff"
  ADD CONSTRAINT "MissionLogisticsHandoff_logisticsPackId_fkey"
  FOREIGN KEY ("logisticsPackId") REFERENCES "kelly_calendar"."MissionLogisticsPack"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."MissionLogisticsHandoff"
  ADD CONSTRAINT "MissionLogisticsHandoff_logisticsItemId_fkey"
  FOREIGN KEY ("logisticsItemId") REFERENCES "kelly_calendar"."MissionLogisticsItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionLogisticsAcknowledgement" (
  "id" TEXT NOT NULL,
  "logisticsPackId" TEXT NOT NULL,
  "issueKey" TEXT NOT NULL,
  "issueType" "kelly_calendar"."MissionLogisticsIssueType" NOT NULL,
  "title" TEXT NOT NULL,
  "disposition" "kelly_calendar"."MissionLogisticsAcknowledgementDisposition" NOT NULL,
  "note" TEXT,
  "acceptedRiskReason" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionLogisticsAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionLogisticsAcknowledgement_logisticsPackId_issueKey_key"
  ON "kelly_calendar"."MissionLogisticsAcknowledgement"("logisticsPackId", "issueKey");
CREATE INDEX "MissionLogisticsAcknowledgement_logisticsPackId_disposition_idx"
  ON "kelly_calendar"."MissionLogisticsAcknowledgement"("logisticsPackId", "disposition");
CREATE INDEX "MissionLogisticsAcknowledgement_issueType_idx"
  ON "kelly_calendar"."MissionLogisticsAcknowledgement"("issueType");

ALTER TABLE "kelly_calendar"."MissionLogisticsAcknowledgement"
  ADD CONSTRAINT "MissionLogisticsAcknowledgement_logisticsPackId_fkey"
  FOREIGN KEY ("logisticsPackId") REFERENCES "kelly_calendar"."MissionLogisticsPack"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
