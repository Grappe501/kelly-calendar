-- V2.1 Volunteer Staffing and Assignment Reconciliation (D19)
-- Additive. Lazy-create plans only via intentional writes.
-- Owned schema: kelly_calendar

CREATE TYPE "kelly_calendar"."MissionStaffingPlanStatus" AS ENUM (
  'DRAFT', 'IN_PROGRESS', 'READY', 'READY_WITH_RISK', 'WRAP_PENDING', 'CLOSED'
);

CREATE TYPE "kelly_calendar"."MissionStaffingRequirementCriticality" AS ENUM (
  'CRITICAL', 'STANDARD', 'OPTIONAL'
);

CREATE TYPE "kelly_calendar"."MissionStaffingAssignmentTargetType" AS ENUM (
  'CAMPAIGN_USER', 'LOCAL_PERSON', 'MANUAL_SCOPED', 'CONFIRMED_EXTERNAL_REF'
);

CREATE TYPE "kelly_calendar"."MissionStaffingAssignmentStatus" AS ENUM (
  'PROPOSED', 'ASSIGNED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'CHECKED_IN', 'RELEASED', 'NO_SHOW'
);

CREATE TYPE "kelly_calendar"."MissionStaffingAcknowledgementDisposition" AS ENUM (
  'ACKNOWLEDGED', 'ACCEPTED_RISK', 'RESOLVED', 'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."MissionStaffingPlan" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "campaignDateKey" TEXT NOT NULL,
  "status" "kelly_calendar"."MissionStaffingPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "staffingRequired" BOOLEAN NOT NULL DEFAULT false,
  "staffingLeadName" TEXT,
  "staffingLeadUserId" TEXT,
  "confirmationFingerprint" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "isStale" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionStaffingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionStaffingPlan_missionId_key" ON "kelly_calendar"."MissionStaffingPlan"("missionId");
CREATE INDEX "MissionStaffingPlan_campaignDateKey_idx" ON "kelly_calendar"."MissionStaffingPlan"("campaignDateKey");
CREATE INDEX "MissionStaffingPlan_status_idx" ON "kelly_calendar"."MissionStaffingPlan"("status");
CREATE INDEX "MissionStaffingPlan_campaignScopeKey_idx" ON "kelly_calendar"."MissionStaffingPlan"("campaignScopeKey");

ALTER TABLE "kelly_calendar"."MissionStaffingPlan"
  ADD CONSTRAINT "MissionStaffingPlan_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionStaffingRequirement" (
  "id" TEXT NOT NULL,
  "staffingPlanId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "roleLabel" TEXT NOT NULL,
  "description" TEXT,
  "requiredCount" INTEGER NOT NULL DEFAULT 1,
  "minimumCount" INTEGER NOT NULL DEFAULT 1,
  "criticality" "kelly_calendar"."MissionStaffingRequirementCriticality" NOT NULL DEFAULT 'STANDARD',
  "requiredByAt" TIMESTAMP(3),
  "skillsNote" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionStaffingRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionStaffingRequirement_staffingPlanId_roleKey_key"
  ON "kelly_calendar"."MissionStaffingRequirement"("staffingPlanId", "roleKey");
CREATE INDEX "MissionStaffingRequirement_staffingPlanId_sortOrder_idx"
  ON "kelly_calendar"."MissionStaffingRequirement"("staffingPlanId", "sortOrder");

ALTER TABLE "kelly_calendar"."MissionStaffingRequirement"
  ADD CONSTRAINT "MissionStaffingRequirement_staffingPlanId_fkey"
  FOREIGN KEY ("staffingPlanId") REFERENCES "kelly_calendar"."MissionStaffingPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionStaffingAssignment" (
  "id" TEXT NOT NULL,
  "staffingPlanId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "targetType" "kelly_calendar"."MissionStaffingAssignmentTargetType" NOT NULL,
  "campaignUserId" TEXT,
  "localPersonId" TEXT,
  "manualDisplayLabel" TEXT,
  "manualContactHint" TEXT,
  "confirmedExternalPersonId" TEXT,
  "mobilizeObservationId" TEXT,
  "status" "kelly_calendar"."MissionStaffingAssignmentStatus" NOT NULL DEFAULT 'PROPOSED',
  "assignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3),
  "confirmedByUserId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "checkedInAt" TIMESTAMP(3),
  "checkedInByUserId" TEXT,
  "releasedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "noShowAt" TIMESTAMP(3),
  "provenance" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionStaffingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionStaffingAssignment_staffingPlanId_status_idx"
  ON "kelly_calendar"."MissionStaffingAssignment"("staffingPlanId", "status");
CREATE INDEX "MissionStaffingAssignment_requirementId_status_idx"
  ON "kelly_calendar"."MissionStaffingAssignment"("requirementId", "status");
CREATE INDEX "MissionStaffingAssignment_campaignUserId_idx"
  ON "kelly_calendar"."MissionStaffingAssignment"("campaignUserId");
CREATE INDEX "MissionStaffingAssignment_localPersonId_idx"
  ON "kelly_calendar"."MissionStaffingAssignment"("localPersonId");
CREATE INDEX "MissionStaffingAssignment_confirmedExternalPersonId_idx"
  ON "kelly_calendar"."MissionStaffingAssignment"("confirmedExternalPersonId");

ALTER TABLE "kelly_calendar"."MissionStaffingAssignment"
  ADD CONSTRAINT "MissionStaffingAssignment_staffingPlanId_fkey"
  FOREIGN KEY ("staffingPlanId") REFERENCES "kelly_calendar"."MissionStaffingPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."MissionStaffingAssignment"
  ADD CONSTRAINT "MissionStaffingAssignment_requirementId_fkey"
  FOREIGN KEY ("requirementId") REFERENCES "kelly_calendar"."MissionStaffingRequirement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionStaffingAcknowledgement" (
  "id" TEXT NOT NULL,
  "staffingPlanId" TEXT NOT NULL,
  "issueKey" TEXT NOT NULL,
  "issueType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "disposition" "kelly_calendar"."MissionStaffingAcknowledgementDisposition" NOT NULL,
  "note" TEXT,
  "acceptedRiskReason" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionStaffingAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionStaffingAcknowledgement_staffingPlanId_issueKey_key"
  ON "kelly_calendar"."MissionStaffingAcknowledgement"("staffingPlanId", "issueKey");
CREATE INDEX "MissionStaffingAcknowledgement_staffingPlanId_idx"
  ON "kelly_calendar"."MissionStaffingAcknowledgement"("staffingPlanId");

ALTER TABLE "kelly_calendar"."MissionStaffingAcknowledgement"
  ADD CONSTRAINT "MissionStaffingAcknowledgement_staffingPlanId_fkey"
  FOREIGN KEY ("staffingPlanId") REFERENCES "kelly_calendar"."MissionStaffingPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
