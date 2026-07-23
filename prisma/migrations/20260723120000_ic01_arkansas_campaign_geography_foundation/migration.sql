-- IC-01: Arkansas Campaign Geography Foundation (ADR-102).
-- Forward-only additive. Extends ArkansasCounty / EventGeography.
-- Does not create or mutate Events/Missions schedule fields.

ALTER TABLE "kelly_calendar"."ArkansasCounty"
  ADD COLUMN "stateFips" TEXT NOT NULL DEFAULT '05',
  ADD COLUMN "geoid" TEXT,
  ADD COLUMN "normalizedName" TEXT,
  ADD COLUMN "countySeat" TEXT,
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "dataVintage" TEXT,
  ADD COLUMN "seatReviewState" TEXT;

CREATE UNIQUE INDEX "ArkansasCounty_geoid_key"
  ON "kelly_calendar"."ArkansasCounty"("geoid");

ALTER TABLE "kelly_calendar"."EventGeography"
  ADD COLUMN "matchMethod" TEXT,
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "evidenceFingerprint" TEXT,
  ADD COLUMN "confirmedByUserId" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "outcome" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "placeAuthorityId" TEXT;

CREATE INDEX "EventGeography_eventId_isActive_idx"
  ON "kelly_calendar"."EventGeography"("eventId", "isActive");
CREATE INDEX "EventGeography_evidenceFingerprint_idx"
  ON "kelly_calendar"."EventGeography"("evidenceFingerprint");

CREATE TABLE "kelly_calendar"."GeographyPlaceAuthority" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "placeType" TEXT NOT NULL,
  "censusPlaceGeoid" TEXT NOT NULL,
  "population" INTEGER,
  "populationRank" INTEGER,
  "populationVintage" TEXT,
  "normalizedName" TEXT,
  "sourceKey" TEXT,
  "dataVintage" TEXT,
  "isTop250" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GeographyPlaceAuthority_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeographyPlaceAuthority_slug_key"
  ON "kelly_calendar"."GeographyPlaceAuthority"("slug");
CREATE UNIQUE INDEX "GeographyPlaceAuthority_censusPlaceGeoid_key"
  ON "kelly_calendar"."GeographyPlaceAuthority"("censusPlaceGeoid");
CREATE INDEX "GeographyPlaceAuthority_populationRank_idx"
  ON "kelly_calendar"."GeographyPlaceAuthority"("populationRank");
CREATE INDEX "GeographyPlaceAuthority_normalizedName_idx"
  ON "kelly_calendar"."GeographyPlaceAuthority"("normalizedName");

CREATE TABLE "kelly_calendar"."GeographyPlaceCounty" (
  "id" TEXT NOT NULL,
  "placeAuthorityId" TEXT NOT NULL,
  "countyId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "GeographyPlaceCounty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeographyPlaceCounty_placeAuthorityId_countyId_key"
  ON "kelly_calendar"."GeographyPlaceCounty"("placeAuthorityId", "countyId");
CREATE INDEX "GeographyPlaceCounty_countyId_idx"
  ON "kelly_calendar"."GeographyPlaceCounty"("countyId");

CREATE TABLE "kelly_calendar"."GeographyAlias" (
  "id" TEXT NOT NULL,
  "aliasText" TEXT NOT NULL,
  "normalizedAlias" TEXT NOT NULL,
  "aliasType" TEXT NOT NULL DEFAULT 'COMMON',
  "countyId" TEXT,
  "placeAuthorityId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sourceKey" TEXT,
  CONSTRAINT "GeographyAlias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeographyAlias_normalizedAlias_idx"
  ON "kelly_calendar"."GeographyAlias"("normalizedAlias");

CREATE TABLE "kelly_calendar"."CampaignGeographyRegion" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "regionKind" TEXT NOT NULL DEFAULT 'CAMPAIGN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sourceKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignGeographyRegion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignGeographyRegion_slug_key"
  ON "kelly_calendar"."CampaignGeographyRegion"("slug");

CREATE TABLE "kelly_calendar"."CampaignGeographyRegionMember" (
  "id" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "countyId" TEXT,
  "placeAuthorityId" TEXT,
  "memberRole" TEXT NOT NULL DEFAULT 'MEMBER',
  CONSTRAINT "CampaignGeographyRegionMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignGeographyRegionMember_regionId_idx"
  ON "kelly_calendar"."CampaignGeographyRegionMember"("regionId");

CREATE TABLE "kelly_calendar"."CampaignTravelCorridor" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sourceKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignTravelCorridor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignTravelCorridor_slug_key"
  ON "kelly_calendar"."CampaignTravelCorridor"("slug");

CREATE TABLE "kelly_calendar"."CampaignTravelCorridorNode" (
  "id" TEXT NOT NULL,
  "corridorId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "countyId" TEXT,
  "placeAuthorityId" TEXT,
  "nodeLabel" TEXT,
  CONSTRAINT "CampaignTravelCorridorNode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignTravelCorridorNode_corridorId_sequence_key"
  ON "kelly_calendar"."CampaignTravelCorridorNode"("corridorId", "sequence");

CREATE TABLE "kelly_calendar"."CampaignCountyPriority" (
  "id" TEXT NOT NULL,
  "countyId" TEXT NOT NULL,
  "priorityTier" TEXT NOT NULL,
  "rationale" TEXT,
  "provenance" TEXT NOT NULL,
  "sourceKey" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCountyPriority_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCountyPriority_countyId_isActive_idx"
  ON "kelly_calendar"."CampaignCountyPriority"("countyId", "isActive");

CREATE TABLE "kelly_calendar"."CampaignFocusArea" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "focusKind" TEXT NOT NULL DEFAULT 'CAMPAIGN',
  "provenance" TEXT NOT NULL DEFAULT 'CAMPAIGN_ENTERED',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sourceKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignFocusArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignFocusArea_slug_key"
  ON "kelly_calendar"."CampaignFocusArea"("slug");

CREATE TABLE "kelly_calendar"."CampaignFocusAreaGeography" (
  "id" TEXT NOT NULL,
  "focusAreaId" TEXT NOT NULL,
  "countyId" TEXT,
  "placeAuthorityId" TEXT,
  CONSTRAINT "CampaignFocusAreaGeography_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignFocusAreaGeography_focusAreaId_idx"
  ON "kelly_calendar"."CampaignFocusAreaGeography"("focusAreaId");

CREATE TABLE "kelly_calendar"."MissionGeography" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "countyId" TEXT,
  "placeAuthorityId" TEXT,
  "matchMethod" TEXT,
  "sourceKey" TEXT,
  "evidenceFingerprint" TEXT,
  "confirmedByUserId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "outcome" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "MissionGeography_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionGeography_missionId_isActive_idx"
  ON "kelly_calendar"."MissionGeography"("missionId", "isActive");
CREATE INDEX "MissionGeography_evidenceFingerprint_idx"
  ON "kelly_calendar"."MissionGeography"("evidenceFingerprint");

CREATE TABLE "kelly_calendar"."GeographySource" (
  "id" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "publisher" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "vintage" TEXT,
  "retrievalDate" TIMESTAMP(3),
  "localPath" TEXT,
  "contentFingerprint" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GeographySource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeographySource_sourceKey_key"
  ON "kelly_calendar"."GeographySource"("sourceKey");

CREATE TABLE "kelly_calendar"."GeographyImportRun" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT,
  "runKind" TEXT NOT NULL DEFAULT 'FOUNDATION_SEED',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'STARTED',
  "countiesUpserted" INTEGER NOT NULL DEFAULT 0,
  "placesUpserted" INTEGER NOT NULL DEFAULT 0,
  "countiesCreated" INTEGER NOT NULL DEFAULT 0,
  "placesCreated" INTEGER NOT NULL DEFAULT 0,
  "manifestJson" JSONB,
  "proofPath" TEXT,
  "errorSummary" TEXT,
  CONSTRAINT "GeographyImportRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kelly_calendar"."GeographyReconciliationCandidate" (
  "id" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "inputText" TEXT,
  "normalizedInput" TEXT,
  "proposedCountyId" TEXT,
  "proposedPlaceAuthorityId" TEXT,
  "matchMethod" TEXT,
  "outcome" TEXT,
  "confidence" TEXT,
  "evidenceJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "GeographyReconciliationCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeographyReconciliationCandidate_subjectType_subjectId_idx"
  ON "kelly_calendar"."GeographyReconciliationCandidate"("subjectType", "subjectId");
CREATE INDEX "GeographyReconciliationCandidate_status_idx"
  ON "kelly_calendar"."GeographyReconciliationCandidate"("status");

ALTER TABLE "kelly_calendar"."EventGeography"
  ADD CONSTRAINT "EventGeography_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyPlaceCounty"
  ADD CONSTRAINT "GeographyPlaceCounty_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyPlaceCounty"
  ADD CONSTRAINT "GeographyPlaceCounty_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyAlias"
  ADD CONSTRAINT "GeographyAlias_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyAlias"
  ADD CONSTRAINT "GeographyAlias_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignGeographyRegionMember"
  ADD CONSTRAINT "CampaignGeographyRegionMember_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "kelly_calendar"."CampaignGeographyRegion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignGeographyRegionMember"
  ADD CONSTRAINT "CampaignGeographyRegionMember_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignGeographyRegionMember"
  ADD CONSTRAINT "CampaignGeographyRegionMember_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignTravelCorridorNode"
  ADD CONSTRAINT "CampaignTravelCorridorNode_corridorId_fkey"
  FOREIGN KEY ("corridorId") REFERENCES "kelly_calendar"."CampaignTravelCorridor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignTravelCorridorNode"
  ADD CONSTRAINT "CampaignTravelCorridorNode_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignTravelCorridorNode"
  ADD CONSTRAINT "CampaignTravelCorridorNode_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignCountyPriority"
  ADD CONSTRAINT "CampaignCountyPriority_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignFocusAreaGeography"
  ADD CONSTRAINT "CampaignFocusAreaGeography_focusAreaId_fkey"
  FOREIGN KEY ("focusAreaId") REFERENCES "kelly_calendar"."CampaignFocusArea"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignFocusAreaGeography"
  ADD CONSTRAINT "CampaignFocusAreaGeography_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignFocusAreaGeography"
  ADD CONSTRAINT "CampaignFocusAreaGeography_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."MissionGeography"
  ADD CONSTRAINT "MissionGeography_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."MissionGeography"
  ADD CONSTRAINT "MissionGeography_countyId_fkey"
  FOREIGN KEY ("countyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."MissionGeography"
  ADD CONSTRAINT "MissionGeography_placeAuthorityId_fkey"
  FOREIGN KEY ("placeAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyImportRun"
  ADD CONSTRAINT "GeographyImportRun_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "kelly_calendar"."GeographySource"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyReconciliationCandidate"
  ADD CONSTRAINT "GeographyReconciliationCandidate_proposedCountyId_fkey"
  FOREIGN KEY ("proposedCountyId") REFERENCES "kelly_calendar"."ArkansasCounty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."GeographyReconciliationCandidate"
  ADD CONSTRAINT "GeographyReconciliationCandidate_proposedPlaceAuthorityId_fkey"
  FOREIGN KEY ("proposedPlaceAuthorityId") REFERENCES "kelly_calendar"."GeographyPlaceAuthority"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
