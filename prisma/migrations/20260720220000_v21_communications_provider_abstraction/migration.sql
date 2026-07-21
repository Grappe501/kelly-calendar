-- D22 Communications Provider Abstraction Layer
-- Sandbox certification + domain verification + production safety gates.
-- No credentials stored. Production dispatch remains blocked by default.

CREATE TYPE "kelly_calendar"."CommProviderLifecycleStatus" AS ENUM (
  'AVAILABLE',
  'INSTALLED',
  'VERIFIED',
  'SANDBOX_READY',
  'PRODUCTION_READY',
  'DISABLED',
  'RETIRED'
);

CREATE TYPE "kelly_calendar"."CommSandboxRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'PASSED',
  'FAILED',
  'BLOCKED'
);

CREATE TYPE "kelly_calendar"."CommDomainCheckStatus" AS ENUM (
  'UNKNOWN',
  'PASS',
  'FAIL',
  'PENDING',
  'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."CommunicationProviderCatalogEntry" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "providerKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "lifecycleStatus" "kelly_calendar"."CommProviderLifecycleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "capabilitiesJson" JSONB NOT NULL DEFAULT '{}',
  "healthSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "isOfficialAdapter" BOOLEAN NOT NULL DEFAULT false,
  "isSandboxOnly" BOOLEAN NOT NULL DEFAULT false,
  "isStub" BOOLEAN NOT NULL DEFAULT false,
  "averageLatencyMs" INTEGER,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "domainVerified" BOOLEAN NOT NULL DEFAULT false,
  "senderVerified" BOOLEAN NOT NULL DEFAULT false,
  "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
  "sandboxWorking" BOOLEAN NOT NULL DEFAULT false,
  "productionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "suppressionSyncAgeMinutes" INTEGER,
  "operatorNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationProviderCatalogEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationProviderCatalog_scope_provider"
  ON "kelly_calendar"."CommunicationProviderCatalogEntry"("campaignScopeKey", "providerKey");
CREATE INDEX "CommunicationProviderCatalogEntry_lifecycleStatus_idx"
  ON "kelly_calendar"."CommunicationProviderCatalogEntry"("lifecycleStatus");

CREATE TABLE "kelly_calendar"."CommunicationSandboxCertificationRun" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "providerKey" TEXT NOT NULL,
  "status" "kelly_calendar"."CommSandboxRunStatus" NOT NULL DEFAULT 'PENDING',
  "checklistJson" JSONB NOT NULL DEFAULT '[]',
  "evidenceJson" JSONB NOT NULL DEFAULT '{}',
  "passedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "averageLatencyMs" INTEGER,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "requestedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationSandboxCertificationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationSandboxCertificationRun_providerKey_idx"
  ON "kelly_calendar"."CommunicationSandboxCertificationRun"("providerKey");
CREATE INDEX "CommunicationSandboxCertificationRun_status_idx"
  ON "kelly_calendar"."CommunicationSandboxCertificationRun"("status");

CREATE TABLE "kelly_calendar"."CommunicationDomainVerification" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "providerKey" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "spfStatus" "kelly_calendar"."CommDomainCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
  "dkimStatus" "kelly_calendar"."CommDomainCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
  "dmarcStatus" "kelly_calendar"."CommDomainCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
  "senderVerified" BOOLEAN NOT NULL DEFAULT false,
  "returnPathOk" BOOLEAN NOT NULL DEFAULT false,
  "trackingDomainOk" BOOLEAN NOT NULL DEFAULT false,
  "bimiStatus" "kelly_calendar"."CommDomainCheckStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "detailsJson" JSONB NOT NULL DEFAULT '{}',
  "lastCheckedAt" TIMESTAMP(3),
  "nextCheckAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationDomainVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationDomainVerification_scope_provider_domain"
  ON "kelly_calendar"."CommunicationDomainVerification"("campaignScopeKey", "providerKey", "domain");
CREATE INDEX "CommunicationDomainVerification_providerKey_idx"
  ON "kelly_calendar"."CommunicationDomainVerification"("providerKey");

CREATE TABLE "kelly_calendar"."CommunicationSandboxTestRun" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "providerKey" TEXT NOT NULL,
  "status" "kelly_calendar"."CommSandboxRunStatus" NOT NULL DEFAULT 'PENDING',
  "recipientMasked" TEXT,
  "subject" TEXT,
  "expectedEventsJson" JSONB NOT NULL DEFAULT '[]',
  "resultsJson" JSONB NOT NULL DEFAULT '{}',
  "webhookTimelineJson" JSONB NOT NULL DEFAULT '[]',
  "latencyMs" INTEGER,
  "evidenceJson" JSONB NOT NULL DEFAULT '{}',
  "requestedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationSandboxTestRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationSandboxTestRun_providerKey_idx"
  ON "kelly_calendar"."CommunicationSandboxTestRun"("providerKey");

CREATE TABLE "kelly_calendar"."CommunicationProviderMetricSample" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "providerKey" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationProviderMetricSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationProviderMetricSample_providerKey_metricKey_idx"
  ON "kelly_calendar"."CommunicationProviderMetricSample"("providerKey", "metricKey");
CREATE INDEX "CommunicationProviderMetricSample_windowStart_idx"
  ON "kelly_calendar"."CommunicationProviderMetricSample"("windowStart");

CREATE TABLE "kelly_calendar"."CommunicationProductionGateState" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL,
  "productionProviderSelected" BOOLEAN NOT NULL DEFAULT false,
  "sandboxPassed" BOOLEAN NOT NULL DEFAULT false,
  "senderVerified" BOOLEAN NOT NULL DEFAULT false,
  "domainVerified" BOOLEAN NOT NULL DEFAULT false,
  "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
  "killSwitchOff" BOOLEAN NOT NULL DEFAULT false,
  "operatorApproval" BOOLEAN NOT NULL DEFAULT false,
  "campaignApproval" BOOLEAN NOT NULL DEFAULT false,
  "finalConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "controlledLiveTestApproved" BOOLEAN NOT NULL DEFAULT false,
  "blockedReason" TEXT NOT NULL DEFAULT 'DISPATCH BLOCKED — D22 production gates incomplete',
  "changedByUserId" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationProductionGateState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationProductionGateState_campaignScopeKey_key"
  ON "kelly_calendar"."CommunicationProductionGateState"("campaignScopeKey");
