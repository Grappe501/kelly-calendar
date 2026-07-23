-- IC-02 RedDirt Read Integration (ADR-104)
-- Additive only: provider enum values + strategic observation/fact tables.
-- No seed data, no automatic connections/runs/facts.

ALTER TYPE "kelly_calendar"."ExternalProvider" ADD VALUE IF NOT EXISTS 'REDDIRT';
ALTER TYPE "kelly_calendar"."ExternalObjectType" ADD VALUE IF NOT EXISTS 'GEOGRAPHY_COUNTY';
ALTER TYPE "kelly_calendar"."ExternalObjectType" ADD VALUE IF NOT EXISTS 'GEOGRAPHY_PLACE';
ALTER TYPE "kelly_calendar"."ExternalObjectType" ADD VALUE IF NOT EXISTS 'STRATEGIC_FACT';

CREATE TABLE IF NOT EXISTS "kelly_calendar"."StrategicSourceObservation" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "provider" "kelly_calendar"."ExternalProvider" NOT NULL,
    "externalObjectType" "kelly_calendar"."ExternalObjectType" NOT NULL,
    "externalObjectId" TEXT NOT NULL,
    "remoteUpdatedAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "normalizedFingerprint" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "allowedFieldsJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT,
    "privacyClassification" TEXT NOT NULL,
    "remoteDeleted" BOOLEAN NOT NULL DEFAULT false,
    "provenance" "kelly_calendar"."ExternalSyncProvenance" NOT NULL DEFAULT 'IMPORT',
    "retentionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "syncRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicSourceObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "kelly_calendar"."StrategicGeographyFact" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "provider" "kelly_calendar"."ExternalProvider" NOT NULL DEFAULT 'REDDIRT',
    "externalObjectType" "kelly_calendar"."ExternalObjectType" NOT NULL,
    "externalObjectId" TEXT NOT NULL,
    "externalObjectReferenceId" TEXT,
    "observationId" TEXT,
    "arkansasCountyId" TEXT,
    "geographyPlaceAuthorityId" TEXT,
    "factKind" TEXT NOT NULL,
    "factValue" TEXT NOT NULL,
    "factUnits" TEXT,
    "sourceAttributionLabel" TEXT NOT NULL DEFAULT 'RedDirt-sourced',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "contentFingerprint" TEXT NOT NULL,
    "sourceStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reviewStatus" TEXT NOT NULL DEFAULT 'APPLIED',
    "provenance" "kelly_calendar"."ExternalSyncProvenance" NOT NULL DEFAULT 'IMPORT',
    "archivedAt" TIMESTAMP(3),
    "appliedByUserId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "syncRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategicGeographyFact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StrategicSourceObservation_campaignScopeKey_provider_externalObjectType_externalObjectId_normalizedFingerprint_key"
  ON "kelly_calendar"."StrategicSourceObservation"("campaignScopeKey", "provider", "externalObjectType", "externalObjectId", "normalizedFingerprint");

CREATE INDEX IF NOT EXISTS "StrategicSourceObservation_campaignScopeKey_provider_observedAt_idx"
  ON "kelly_calendar"."StrategicSourceObservation"("campaignScopeKey", "provider", "observedAt");

CREATE INDEX IF NOT EXISTS "StrategicSourceObservation_syncRunId_idx"
  ON "kelly_calendar"."StrategicSourceObservation"("syncRunId");

CREATE UNIQUE INDEX IF NOT EXISTS "StrategicGeographyFact_campaignScopeKey_provider_externalObjectId_factKind_contentFingerprint_key"
  ON "kelly_calendar"."StrategicGeographyFact"("campaignScopeKey", "provider", "externalObjectId", "factKind", "contentFingerprint");

CREATE INDEX IF NOT EXISTS "StrategicGeographyFact_arkansasCountyId_sourceStatus_idx"
  ON "kelly_calendar"."StrategicGeographyFact"("arkansasCountyId", "sourceStatus");

CREATE INDEX IF NOT EXISTS "StrategicGeographyFact_geographyPlaceAuthorityId_sourceStatus_idx"
  ON "kelly_calendar"."StrategicGeographyFact"("geographyPlaceAuthorityId", "sourceStatus");

CREATE INDEX IF NOT EXISTS "StrategicGeographyFact_campaignScopeKey_provider_sourceStatus_idx"
  ON "kelly_calendar"."StrategicGeographyFact"("campaignScopeKey", "provider", "sourceStatus");

CREATE INDEX IF NOT EXISTS "StrategicGeographyFact_syncRunId_idx"
  ON "kelly_calendar"."StrategicGeographyFact"("syncRunId");

ALTER TABLE "kelly_calendar"."StrategicGeographyFact"
  DROP CONSTRAINT IF EXISTS "StrategicGeographyFact_observationId_fkey";

ALTER TABLE "kelly_calendar"."StrategicGeographyFact"
  ADD CONSTRAINT "StrategicGeographyFact_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "kelly_calendar"."StrategicSourceObservation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
