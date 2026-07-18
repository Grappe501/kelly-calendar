-- Additive Kelly Calendar fields only (kelly_calendar schema).
-- RedDirt impact: none
-- Purpose: templateVersion, archive permission flag, CRM linkage fields

ALTER TABLE "kelly_calendar"."CalendarMembership"
  ADD COLUMN IF NOT EXISTS "canArchiveEvents" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "kelly_calendar"."Event"
  ADD COLUMN IF NOT EXISTS "templateVersion" INTEGER;

ALTER TABLE "kelly_calendar"."Person"
  ADD COLUMN IF NOT EXISTS "externalCrmId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalSystem" TEXT;

ALTER TABLE "kelly_calendar"."Organization"
  ADD COLUMN IF NOT EXISTS "externalSystem" TEXT;
