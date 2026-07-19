-- Google Calendar OAuth (read-only) + estimated campaign travel legs
-- Schema: kelly_calendar only

CREATE TYPE "kelly_calendar"."GoogleConnectionStatus" AS ENUM (
  'NOT_CONNECTED',
  'CONNECTED',
  'REAUTH_REQUIRED',
  'REVOKED',
  'ERROR'
);

CREATE TYPE "kelly_calendar"."GoogleReconcileStatus" AS ENUM (
  'AUTO_MATCH_HIGH_CONFIDENCE',
  'REVIEW_POSSIBLE_MATCH',
  'NO_MATCH',
  'SOURCE_CONFLICT'
);

CREATE TYPE "kelly_calendar"."RouteTruthType" AS ENUM (
  'ACTUAL_ODOMETER',
  'ACTUAL_TIMELINE',
  'GOOGLE_ROUTE_ESTIMATE',
  'MANUAL_ESTIMATE',
  'UNKNOWN'
);

CREATE TYPE "kelly_calendar"."TravelLegReviewStatus" AS ENUM (
  'UNREVIEWED',
  'ACCEPTED',
  'REJECTED',
  'AMBIGUOUS',
  'EXCLUDED'
);

CREATE TABLE "kelly_calendar"."GoogleOAuthPendingState" (
  "id" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "codeVerifier" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoogleOAuthPendingState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleOAuthPendingState_state_key" ON "kelly_calendar"."GoogleOAuthPendingState"("state");
CREATE INDEX "GoogleOAuthPendingState_expiresAt_idx" ON "kelly_calendar"."GoogleOAuthPendingState"("expiresAt");

CREATE TABLE "kelly_calendar"."GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "googleAccountEmail" TEXT,
  "googleAccountSubject" TEXT,
  "googleCalendarId" TEXT NOT NULL DEFAULT 'primary',
  "refreshTokenCiphertext" TEXT NOT NULL,
  "refreshTokenIv" TEXT NOT NULL,
  "refreshTokenAuthTag" TEXT NOT NULL,
  "encryptionVersion" TEXT NOT NULL DEFAULT 'v1',
  "grantedScopes" TEXT[],
  "connectionStatus" "kelly_calendar"."GoogleConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  "connectedByUserId" TEXT,
  "connectedAt" TIMESTAMP(3),
  "lastTokenRefreshAt" TIMESTAMP(3),
  "lastTokenRefreshFailureAt" TIMESTAMP(3),
  "lastSyncStartedAt" TIMESTAMP(3),
  "lastSyncCompletedAt" TIMESTAMP(3),
  "lastSyncStatus" "kelly_calendar"."SyncStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "lastSyncErrorCode" TEXT,
  "syncCursor" TEXT,
  "historicalImportedThrough" TIMESTAMP(3),
  "pendingReconcileCount" INTEGER NOT NULL DEFAULT 0,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "externalSourceId" TEXT,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_externalSourceId_key" ON "kelly_calendar"."GoogleCalendarConnection"("externalSourceId");
CREATE INDEX "GoogleCalendarConnection_connectionStatus_idx" ON "kelly_calendar"."GoogleCalendarConnection"("connectionStatus");

ALTER TABLE "kelly_calendar"."GoogleCalendarConnection"
  ADD CONSTRAINT "GoogleCalendarConnection_externalSourceId_fkey"
  FOREIGN KEY ("externalSourceId") REFERENCES "kelly_calendar"."ExternalCalendarSource"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CalendarImportRecord"
  ADD COLUMN "googleReconcileStatus" "kelly_calendar"."GoogleReconcileStatus";

CREATE INDEX "CalendarImportRecord_googleReconcileStatus_idx"
  ON "kelly_calendar"."CalendarImportRecord"("googleReconcileStatus");

CREATE TABLE "kelly_calendar"."CampaignTravelLeg" (
  "id" TEXT NOT NULL,
  "fromEventId" TEXT,
  "toEventId" TEXT,
  "originLabel" TEXT,
  "destinationLabel" TEXT,
  "originPlaceId" TEXT,
  "destinationPlaceId" TEXT,
  "departureWindowStart" TIMESTAMP(3),
  "arrivalWindowEnd" TIMESTAMP(3),
  "distanceMeters" INTEGER,
  "durationSeconds" INTEGER,
  "routeProvider" TEXT NOT NULL DEFAULT 'GOOGLE_ROUTES',
  "routeTruthType" "kelly_calendar"."RouteTruthType" NOT NULL DEFAULT 'GOOGLE_ROUTE_ESTIMATE',
  "providerRequestVersion" TEXT,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
  "reviewStatus" "kelly_calendar"."TravelLegReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
  "ambiguityReason" TEXT,
  "excludedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignTravelLeg_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignTravelLeg_fromEventId_toEventId_idx"
  ON "kelly_calendar"."CampaignTravelLeg"("fromEventId", "toEventId");
CREATE INDEX "CampaignTravelLeg_routeTruthType_idx"
  ON "kelly_calendar"."CampaignTravelLeg"("routeTruthType");
CREATE INDEX "CampaignTravelLeg_reviewStatus_idx"
  ON "kelly_calendar"."CampaignTravelLeg"("reviewStatus");

ALTER TABLE "kelly_calendar"."CampaignTravelLeg"
  ADD CONSTRAINT "CampaignTravelLeg_fromEventId_fkey"
  FOREIGN KEY ("fromEventId") REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignTravelLeg"
  ADD CONSTRAINT "CampaignTravelLeg_toEventId_fkey"
  FOREIGN KEY ("toEventId") REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
