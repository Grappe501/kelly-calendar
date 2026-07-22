-- CC-07: extend CalendarSavedView for versioned query contract + visibility.
-- Forward-only additive. Does not rewrite existing saved views.

ALTER TABLE "kelly_calendar"."CalendarSavedView"
  ADD COLUMN IF NOT EXISTS "queryJson" JSONB,
  ADD COLUMN IF NOT EXISTS "querySchemaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "campaignKey" TEXT,
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "roleScope" JSONB,
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "staleState" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "CalendarSavedView_ownerUserId_idx"
  ON "kelly_calendar"."CalendarSavedView"("ownerUserId");
CREATE INDEX IF NOT EXISTS "CalendarSavedView_campaignKey_idx"
  ON "kelly_calendar"."CalendarSavedView"("campaignKey");
CREATE INDEX IF NOT EXISTS "CalendarSavedView_visibility_idx"
  ON "kelly_calendar"."CalendarSavedView"("visibility");
CREATE INDEX IF NOT EXISTS "CalendarSavedView_archivedAt_idx"
  ON "kelly_calendar"."CalendarSavedView"("archivedAt");

-- Existing system views are campaign-shared by convention.
UPDATE "kelly_calendar"."CalendarSavedView"
SET "visibility" = 'CAMPAIGN_SHARED',
    "campaignKey" = COALESCE("campaignKey", 'kelly'),
    "querySchemaVersion" = COALESCE("querySchemaVersion", 1)
WHERE "isSystemView" = true OR "isShared" = true;
