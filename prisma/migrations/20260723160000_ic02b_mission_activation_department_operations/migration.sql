-- IC-02B Mission Activation Playbooks & Department Operations (ADR-106)
-- Additive only. No seeded Mission plans. No Event/Mission mutation.
-- Template rows may be installed via explicit seed command separately.

DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationPlaybookLevel" AS ENUM ('NONE','MINIMAL','STANDARD','MAJOR','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationDepartment" AS ENUM ('EVENTS','COMMUNICATIONS','GRAPHICS','SOCIAL_MEDIA','DIGITAL','PRESS','FIELD_CANVASS','PHONE_BANK','TEXTING','VOLUNTEER_MANAGEMENT','FUNDRAISING','LOGISTICS','TRAVEL','LODGING','DINING','MATERIALS','CANDIDATE','LEADERSHIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationWorkstreamCode" AS ENUM ('EVENT_MANAGEMENT','COMMUNICATIONS','EMAIL','SMS_TEXTING','PHONE_BANK','VOLUNTEER_RECRUITMENT','DOOR_HANGER_CANVASSING','CANDIDATE_CANVASSING','SOCIAL_MEDIA','GRAPHIC_DESIGN','DIGITAL_ADVERTISING','ARKANSAS_PRESS_ASSOCIATION','RADIO','NEWSPAPER','HOSTS_AND_PARTNERS','LOGISTICS','TRAVEL','LODGING','DINING','MATERIALS','FUNDRAISING_SUPPORT','FOLLOW_UP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationPlanStatus" AS ENUM ('ACTIVE','DEACTIVATED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationTaskStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','BLOCKED','WAITING','READY_FOR_REVIEW','COMPLETE','CANCELLED','NOT_APPLICABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationTimingAnchor" AS ENUM ('EVENT_CREATED','MISSION_CREATED','ACTIVATION_APPLIED','EVENT_START','EVENT_END','WEEKEND_BEFORE_EVENT','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationWindowLabel" AS ENUM ('DUE_IMMEDIATELY','MISSED_WINDOW','NOT_APPLICABLE','OPERATOR_REVIEW','ON_SCHEDULE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationBlockerDisposition" AS ENUM ('ACKNOWLEDGED','ACCEPTED_RISK','RESOLVED','NOT_APPLICABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationAdvertisingTactic" AS ENUM ('NO_PAID_ADVERTISING','DIGITAL_DISPLAY','SOCIAL_MEDIA_ADVERTISING','SEARCH_ADVERTISING','ARKANSAS_PRESS_ASSOCIATION_DIGITAL','RADIO','NEWSPAPER_PRINT','NEWSPAPER_DIGITAL','LOCAL_PUBLICATION','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationVolunteerNeedStatus" AS ENUM ('OPEN','PROPOSED','ASSIGNED','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','DECLINED','NO_SHOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."MissionActivationCommCoordStatus" AS ENUM ('WORK_REQUESTED','DRAFT','AWAITING_FACTS','AWAITING_GRAPHIC','AWAITING_CONTENT_APPROVAL','AWAITING_AUDIENCE_APPROVAL','APPROVED','QUEUE_READY','HANDED_OFF','VERIFIED_SENT','FAILED','CANCELLED','STALE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationTemplate" (
    "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "code" TEXT NOT NULL, "version" TEXT NOT NULL,
    "title" TEXT NOT NULL, "description" TEXT, "playbookLevel" "kelly_calendar"."MissionActivationPlaybookLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationTemplate_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "MissionActivationTemplate_campaignScopeKey_code_version_key" ON "kelly_calendar"."MissionActivationTemplate"("campaignScopeKey","code","version");
CREATE INDEX IF NOT EXISTS "MissionActivationTemplate_campaignScopeKey_playbookLevel_isActive_idx" ON "kelly_calendar"."MissionActivationTemplate"("campaignScopeKey","playbookLevel","isActive");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationTemplateStep" (
    "id" TEXT NOT NULL, "templateId" TEXT NOT NULL, "stepKey" TEXT NOT NULL,
    "department" "kelly_calendar"."MissionActivationDepartment" NOT NULL,
    "workstream" "kelly_calendar"."MissionActivationWorkstreamCode" NOT NULL,
    "title" TEXT NOT NULL, "instructions" TEXT,
    "timingAnchor" "kelly_calendar"."MissionActivationTimingAnchor" NOT NULL,
    "offsetHours" INTEGER NOT NULL DEFAULT 0, "defaultPriority" TEXT NOT NULL DEFAULT 'NORMAL',
    "required" BOOLEAN NOT NULL DEFAULT true, "blockingDependencyKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresConsent" BOOLEAN NOT NULL DEFAULT false, "requiresContentApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresAudienceApproval" BOOLEAN NOT NULL DEFAULT false, "requiresExternalProvider" BOOLEAN NOT NULL DEFAULT false,
    "volunteerEligible" BOOLEAN NOT NULL DEFAULT false, "requiresGeographyRadius" BOOLEAN NOT NULL DEFAULT false,
    "requiresCompletionProof" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationTemplateStep_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "MissionActivationTemplateStep_templateId_stepKey_key" ON "kelly_calendar"."MissionActivationTemplateStep"("templateId","stepKey");
CREATE INDEX IF NOT EXISTS "MissionActivationTemplateStep_templateId_department_idx" ON "kelly_calendar"."MissionActivationTemplateStep"("templateId","department");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationPlan" (
    "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "missionId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
    "templateId" TEXT, "templateCode" TEXT NOT NULL, "templateVersion" TEXT NOT NULL,
    "playbookLevel" "kelly_calendar"."MissionActivationPlaybookLevel" NOT NULL,
    "status" "kelly_calendar"."MissionActivationPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "scheduleFingerprint" TEXT NOT NULL, "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedByUserId" TEXT, "deactivatedAt" TIMESTAMP(3), "deactivatedByUserId" TEXT,
    "advertisingTactics" "kelly_calendar"."MissionActivationAdvertisingTactic"[] DEFAULT ARRAY[]::"kelly_calendar"."MissionActivationAdvertisingTactic"[],
    "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationPlan_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "MissionActivationPlan_missionId_templateCode_templateVersion_scheduleFingerprint_key" ON "kelly_calendar"."MissionActivationPlan"("missionId","templateCode","templateVersion","scheduleFingerprint");
CREATE INDEX IF NOT EXISTS "MissionActivationPlan_campaignScopeKey_status_idx" ON "kelly_calendar"."MissionActivationPlan"("campaignScopeKey","status");
CREATE INDEX IF NOT EXISTS "MissionActivationPlan_eventId_idx" ON "kelly_calendar"."MissionActivationPlan"("eventId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationWorkstream" (
    "id" TEXT NOT NULL, "planId" TEXT NOT NULL,
    "workstream" "kelly_calendar"."MissionActivationWorkstreamCode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "department" "kelly_calendar"."MissionActivationDepartment",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationWorkstream_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "MissionActivationWorkstream_planId_workstream_key" ON "kelly_calendar"."MissionActivationWorkstream"("planId","workstream");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationTask" (
    "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "stepKey" TEXT NOT NULL,
    "department" "kelly_calendar"."MissionActivationDepartment" NOT NULL,
    "workstream" "kelly_calendar"."MissionActivationWorkstreamCode" NOT NULL,
    "title" TEXT NOT NULL, "instructions" TEXT,
    "timingAnchor" "kelly_calendar"."MissionActivationTimingAnchor" NOT NULL,
    "dueAt" TIMESTAMP(3), "dueLocked" BOOLEAN NOT NULL DEFAULT false,
    "windowLabel" "kelly_calendar"."MissionActivationWindowLabel" NOT NULL DEFAULT 'ON_SCHEDULE',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" "kelly_calendar"."MissionActivationTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requiresConsent" BOOLEAN NOT NULL DEFAULT false, "requiresContentApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresAudienceApproval" BOOLEAN NOT NULL DEFAULT false, "requiresExternalProvider" BOOLEAN NOT NULL DEFAULT false,
    "volunteerEligible" BOOLEAN NOT NULL DEFAULT false, "accountableOwnerUserId" TEXT,
    "supportingDepartments" "kelly_calendar"."MissionActivationDepartment"[] DEFAULT ARRAY[]::"kelly_calendar"."MissionActivationDepartment"[],
    "commCoordStatus" "kelly_calendar"."MissionActivationCommCoordStatus",
    "completedAt" TIMESTAMP(3), "completedByUserId" TEXT, "staleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationTask_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "MissionActivationTask_planId_stepKey_key" ON "kelly_calendar"."MissionActivationTask"("planId","stepKey");
CREATE INDEX IF NOT EXISTS "MissionActivationTask_campaignScopeKey_department_status_idx" ON "kelly_calendar"."MissionActivationTask"("campaignScopeKey","department","status");
CREATE INDEX IF NOT EXISTS "MissionActivationTask_dueAt_idx" ON "kelly_calendar"."MissionActivationTask"("dueAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationTaskDependency" (
    "id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "dependsOnTaskId" TEXT NOT NULL, "blockerKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionActivationTaskDependency_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "MissionActivationTaskDependency_taskId_dependsOnTaskId_key" ON "kelly_calendar"."MissionActivationTaskDependency"("taskId","dependsOnTaskId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationAssignment" (
    "id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "userId" TEXT, "roleLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationAssignment_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MissionActivationAssignment_taskId_idx" ON "kelly_calendar"."MissionActivationAssignment"("taskId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationVolunteerNeed" (
    "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "taskId" TEXT, "role" TEXT NOT NULL, "description" TEXT,
    "skillsNeeded" TEXT, "numberNeeded" INTEGER NOT NULL DEFAULT 1, "shiftStartsAt" TIMESTAMP(3), "shiftEndsAt" TIMESTAMP(3),
    "locationOrRemote" TEXT, "supervisorLabel" TEXT, "trainingMaterials" TEXT,
    "status" "kelly_calendar"."MissionActivationVolunteerNeedStatus" NOT NULL DEFAULT 'OPEN',
    "assignedPersonId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MissionActivationVolunteerNeed_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MissionActivationVolunteerNeed_planId_status_idx" ON "kelly_calendar"."MissionActivationVolunteerNeed"("planId","status");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationAcknowledgement" (
    "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "blockerKey" TEXT NOT NULL,
    "disposition" "kelly_calendar"."MissionActivationBlockerDisposition" NOT NULL,
    "note" TEXT, "actorUserId" TEXT, "clearsBlocker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionActivationAcknowledgement_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MissionActivationAcknowledgement_planId_blockerKey_idx" ON "kelly_calendar"."MissionActivationAcknowledgement"("planId","blockerKey");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationAuditEvent" (
    "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "planId" TEXT NOT NULL,
    "action" TEXT NOT NULL, "actorUserId" TEXT, "detailJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionActivationAuditEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MissionActivationAuditEvent_planId_createdAt_idx" ON "kelly_calendar"."MissionActivationAuditEvent"("planId","createdAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."MissionActivationNotification" (
    "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "planId" TEXT, "taskId" TEXT,
    "recipientUserId" TEXT, "kind" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT, "deepLink" TEXT NOT NULL,
    "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionActivationNotification_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "MissionActivationNotification_campaignScopeKey_recipientUserId_readAt_idx" ON "kelly_calendar"."MissionActivationNotification"("campaignScopeKey","recipientUserId","readAt");

DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationTemplateStep" ADD CONSTRAINT "MissionActivationTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."MissionActivationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationPlan" ADD CONSTRAINT "MissionActivationPlan_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationPlan" ADD CONSTRAINT "MissionActivationPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."MissionActivationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationWorkstream" ADD CONSTRAINT "MissionActivationWorkstream_planId_fkey" FOREIGN KEY ("planId") REFERENCES "kelly_calendar"."MissionActivationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationTask" ADD CONSTRAINT "MissionActivationTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "kelly_calendar"."MissionActivationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationTaskDependency" ADD CONSTRAINT "MissionActivationTaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "kelly_calendar"."MissionActivationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationTaskDependency" ADD CONSTRAINT "MissionActivationTaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "kelly_calendar"."MissionActivationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationAssignment" ADD CONSTRAINT "MissionActivationAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "kelly_calendar"."MissionActivationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationVolunteerNeed" ADD CONSTRAINT "MissionActivationVolunteerNeed_planId_fkey" FOREIGN KEY ("planId") REFERENCES "kelly_calendar"."MissionActivationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationVolunteerNeed" ADD CONSTRAINT "MissionActivationVolunteerNeed_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "kelly_calendar"."MissionActivationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationAcknowledgement" ADD CONSTRAINT "MissionActivationAcknowledgement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "kelly_calendar"."MissionActivationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationAuditEvent" ADD CONSTRAINT "MissionActivationAuditEvent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "kelly_calendar"."MissionActivationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."MissionActivationNotification" ADD CONSTRAINT "MissionActivationNotification_planId_fkey" FOREIGN KEY ("planId") REFERENCES "kelly_calendar"."MissionActivationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
