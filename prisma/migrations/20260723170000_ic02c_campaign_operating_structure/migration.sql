-- IC-02C Campaign Operating Structure Scaffold (ADR-107)
-- Additive. No people, assignments, Events, Missions, or tasks seeded.

DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignOrgPositionStatus" AS ENUM ('VACANT','FILLED','INTERIM','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignOrgAssignmentStatus" AS ENUM ('PROPOSED','INVITED','ACCEPTED','ACTIVE','INTERIM','PAUSED','ENDED','DECLINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignOrgScopeType" AS ENUM ('STATEWIDE','CLUSTER','COUNTY','PLACE','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignOrgPrivacyLevel" AS ENUM ('INTERNAL','LEADERSHIP','FINANCE_RESTRICTED','CONFIDENTIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignClusterMembershipStatus" AS ENUM ('DRAFT','APPROVED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CountyOrganizingMaturity" AS ENUM ('UNCONTACTED','INITIAL_RELATIONSHIPS','EMERGING_TEAM','LEADERSHIP_ESTABLISHED','ACTIVE_RECURRING_ORGANIZATION','DURABLE_LOCAL_NETWORK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgTemplateInstall" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "templateCode" TEXT NOT NULL, "templateVersion" TEXT NOT NULL,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "installedByUserId" TEXT, "fingerprint" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignOrgTemplateInstall_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignOrgTemplateInstall_campaignScopeKey_templateCode_templateVersion_key" ON "kelly_calendar"."CampaignOrgTemplateInstall"("campaignScopeKey","templateCode","templateVersion");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgDepartment" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "key" TEXT NOT NULL, "displayName" TEXT NOT NULL, "purpose" TEXT,
  "parentKey" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "privacyLevel" "kelly_calendar"."CampaignOrgPrivacyLevel" NOT NULL DEFAULT 'INTERNAL',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "templateVersion" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOrgDepartment_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignOrgDepartment_campaignScopeKey_key_key" ON "kelly_calendar"."CampaignOrgDepartment"("campaignScopeKey","key");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgFunction" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "departmentId" TEXT NOT NULL, "key" TEXT NOT NULL, "displayName" TEXT NOT NULL,
  "purpose" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "templateVersion" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOrgFunction_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignOrgFunction_campaignScopeKey_key_key" ON "kelly_calendar"."CampaignOrgFunction"("campaignScopeKey","key");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgCluster" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "key" TEXT NOT NULL, "displayName" TEXT NOT NULL, "description" TEXT,
  "membershipStatus" "kelly_calendar"."CampaignClusterMembershipStatus" NOT NULL DEFAULT 'DRAFT', "membershipVersion" TEXT NOT NULL DEFAULT '1',
  "templateVersion" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOrgCluster_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignOrgCluster_campaignScopeKey_key_key" ON "kelly_calendar"."CampaignOrgCluster"("campaignScopeKey","key");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgPosition" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "key" TEXT NOT NULL, "title" TEXT NOT NULL,
  "departmentId" TEXT, "functionId" TEXT, "reportsToPositionKey" TEXT,
  "scopeType" "kelly_calendar"."CampaignOrgScopeType" NOT NULL DEFAULT 'STATEWIDE',
  "arkansasCountyId" TEXT, "clusterId" TEXT, "permissionsProfile" TEXT NOT NULL DEFAULT 'COORDINATOR',
  "status" "kelly_calendar"."CampaignOrgPositionStatus" NOT NULL DEFAULT 'VACANT', "maxHolders" INTEGER NOT NULL DEFAULT 1,
  "privacyLevel" "kelly_calendar"."CampaignOrgPrivacyLevel" NOT NULL DEFAULT 'INTERNAL',
  "templateVersion" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOrgPosition_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignOrgPosition_campaignScopeKey_key_key" ON "kelly_calendar"."CampaignOrgPosition"("campaignScopeKey","key");
CREATE INDEX IF NOT EXISTS "CampaignOrgPosition_departmentId_status_idx" ON "kelly_calendar"."CampaignOrgPosition"("departmentId","status");
CREATE INDEX IF NOT EXISTS "CampaignOrgPosition_arkansasCountyId_idx" ON "kelly_calendar"."CampaignOrgPosition"("arkansasCountyId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgPositionAssignment" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "positionId" TEXT NOT NULL, "userId" TEXT, "personId" TEXT,
  "status" "kelly_calendar"."CampaignOrgAssignmentStatus" NOT NULL DEFAULT 'PROPOSED', "isInterim" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "assignedByUserId" TEXT, "reason" TEXT, "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOrgPositionAssignment_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CampaignOrgPositionAssignment_positionId_status_idx" ON "kelly_calendar"."CampaignOrgPositionAssignment"("positionId","status");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignClusterCounty" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "clusterId" TEXT NOT NULL, "arkansasCountyId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT true, "membershipStatus" "kelly_calendar"."CampaignClusterMembershipStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignClusterCounty_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignClusterCounty_clusterId_arkansasCountyId_key" ON "kelly_calendar"."CampaignClusterCounty"("clusterId","arkansasCountyId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgDelegation" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "grantorPositionId" TEXT NOT NULL, "recipientPositionId" TEXT,
  "recipientUserId" TEXT, "permissionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "scopeType" "kelly_calendar"."CampaignOrgScopeType" NOT NULL DEFAULT 'STATEWIDE',
  "arkansasCountyId" TEXT, "clusterId" TEXT, "reason" TEXT, "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "revokedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOrgDelegation_pkey" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignOrgAuditEvent" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "action" TEXT NOT NULL, "actorUserId" TEXT,
  "detailJson" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignOrgAuditEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CampaignOrgAuditEvent_campaignScopeKey_createdAt_idx" ON "kelly_calendar"."CampaignOrgAuditEvent"("campaignScopeKey","createdAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignCountyOrganizingAssessment" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "arkansasCountyId" TEXT NOT NULL,
  "maturity" "kelly_calendar"."CountyOrganizingMaturity" NOT NULL DEFAULT 'UNCONTACTED',
  "factsJson" JSONB NOT NULL DEFAULT '{}', "assessedAt" TIMESTAMP(3), "assessedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCountyOrganizingAssessment_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignCountyOrganizingAssessment_campaignScopeKey_arkansasCountyId_key" ON "kelly_calendar"."CampaignCountyOrganizingAssessment"("campaignScopeKey","arkansasCountyId");

DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgFunction" ADD CONSTRAINT "CampaignOrgFunction_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "kelly_calendar"."CampaignOrgDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgPosition" ADD CONSTRAINT "CampaignOrgPosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "kelly_calendar"."CampaignOrgDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgPosition" ADD CONSTRAINT "CampaignOrgPosition_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "kelly_calendar"."CampaignOrgFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgPosition" ADD CONSTRAINT "CampaignOrgPosition_arkansasCountyId_fkey" FOREIGN KEY ("arkansasCountyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgPosition" ADD CONSTRAINT "CampaignOrgPosition_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "kelly_calendar"."CampaignOrgCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgPositionAssignment" ADD CONSTRAINT "CampaignOrgPositionAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "kelly_calendar"."CampaignOrgPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignClusterCounty" ADD CONSTRAINT "CampaignClusterCounty_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "kelly_calendar"."CampaignOrgCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignClusterCounty" ADD CONSTRAINT "CampaignClusterCounty_arkansasCountyId_fkey" FOREIGN KEY ("arkansasCountyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgDelegation" ADD CONSTRAINT "CampaignOrgDelegation_grantorPositionId_fkey" FOREIGN KEY ("grantorPositionId") REFERENCES "kelly_calendar"."CampaignOrgPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignOrgDelegation" ADD CONSTRAINT "CampaignOrgDelegation_recipientPositionId_fkey" FOREIGN KEY ("recipientPositionId") REFERENCES "kelly_calendar"."CampaignOrgPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
