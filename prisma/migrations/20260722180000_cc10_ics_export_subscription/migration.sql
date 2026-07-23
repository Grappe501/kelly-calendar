-- CC-10: private ICS subscription feeds, access audits, one-time export audits.
-- Forward-only additive. Does not rewrite Events or Missions.
-- Raw subscription tokens are never stored — tokenHash only.

CREATE TYPE "kelly_calendar"."CalendarSubscriptionFeedStatus" AS ENUM (
  'ACTIVE', 'REVOKED', 'EXPIRED', 'DISABLED'
);
CREATE TYPE "kelly_calendar"."CalendarFeedScopeType" AS ENUM (
  'DATE_RANGE', 'RELATIVE_WINDOW', 'SAVED_VIEW', 'CANONICAL_QUERY'
);
CREATE TYPE "kelly_calendar"."CalendarFeedPrivacyProfile" AS ENUM (
  'BUSY_ONLY', 'CITY_ONLY', 'OPERATIONAL_REDACTED'
);

CREATE TABLE "kelly_calendar"."CalendarSubscriptionFeed" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "ownerUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "kelly_calendar"."CalendarSubscriptionFeedStatus" NOT NULL DEFAULT 'ACTIVE',
  "scopeType" "kelly_calendar"."CalendarFeedScopeType" NOT NULL,
  "savedViewId" TEXT,
  "queryJson" JSONB,
  "querySchemaVersion" INTEGER NOT NULL DEFAULT 1,
  "dateWindowPolicyJson" JSONB,
  "privacyProfile" "kelly_calendar"."CalendarFeedPrivacyProfile" NOT NULL,
  "includedStatusesJson" JSONB NOT NULL,
  "includeCancelledHistory" BOOLEAN NOT NULL DEFAULT false,
  "maxVisibilityGrant" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenPrefix" TEXT NOT NULL,
  "tokenVersion" INTEGER NOT NULL DEFAULT 1,
  "feedFingerprint" TEXT,
  "lastRotatedAt" TIMESTAMP(3),
  "lastAccessedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarSubscriptionFeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarSubscriptionFeed_tokenHash_key"
  ON "kelly_calendar"."CalendarSubscriptionFeed"("tokenHash");
CREATE INDEX "CalendarSubscriptionFeed_campaignKey_status_idx"
  ON "kelly_calendar"."CalendarSubscriptionFeed"("campaignKey", "status");
CREATE INDEX "CalendarSubscriptionFeed_ownerUserId_idx"
  ON "kelly_calendar"."CalendarSubscriptionFeed"("ownerUserId");
CREATE INDEX "CalendarSubscriptionFeed_tokenPrefix_idx"
  ON "kelly_calendar"."CalendarSubscriptionFeed"("tokenPrefix");
CREATE INDEX "CalendarSubscriptionFeed_savedViewId_idx"
  ON "kelly_calendar"."CalendarSubscriptionFeed"("savedViewId");

CREATE TABLE "kelly_calendar"."CalendarSubscriptionAccessAudit" (
  "id" TEXT NOT NULL,
  "feedId" TEXT NOT NULL,
  "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resultCategory" TEXT NOT NULL,
  "conditionalNotModified" BOOLEAN NOT NULL DEFAULT false,
  "clientCategory" TEXT,
  "rateLimited" BOOLEAN NOT NULL DEFAULT false,
  "eventCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarSubscriptionAccessAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarSubscriptionAccessAudit_feedId_accessedAt_idx"
  ON "kelly_calendar"."CalendarSubscriptionAccessAudit"("feedId", "accessedAt");
CREATE INDEX "CalendarSubscriptionAccessAudit_accessedAt_idx"
  ON "kelly_calendar"."CalendarSubscriptionAccessAudit"("accessedAt");

ALTER TABLE "kelly_calendar"."CalendarSubscriptionAccessAudit"
  ADD CONSTRAINT "CalendarSubscriptionAccessAudit_feedId_fkey"
  FOREIGN KEY ("feedId") REFERENCES "kelly_calendar"."CalendarSubscriptionFeed"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CalendarExportAudit" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "actorUserId" TEXT NOT NULL,
  "exportMode" TEXT NOT NULL DEFAULT 'ONE_TIME',
  "privacyProfile" TEXT NOT NULL,
  "scopeSummary" TEXT NOT NULL,
  "eventCount" INTEGER NOT NULL DEFAULT 0,
  "truncated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarExportAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarExportAudit_campaignKey_createdAt_idx"
  ON "kelly_calendar"."CalendarExportAudit"("campaignKey", "createdAt");
CREATE INDEX "CalendarExportAudit_actorUserId_idx"
  ON "kelly_calendar"."CalendarExportAudit"("actorUserId");
