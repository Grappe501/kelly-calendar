-- CC-06 Conflict Engine — Calendar Slice (ADR-092)
-- Additive only. No destructive changes; no backfill that invents facts.
-- OperationalConflictRecord / OperationalConflictAction existed but were never
-- populated by any code path before this build — safe to extend in place.

ALTER TABLE "kelly_calendar"."OperationalConflictRecord"
  ADD COLUMN IF NOT EXISTS "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  ADD COLUMN IF NOT EXISTS "factFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "disposition" TEXT,
  ADD COLUMN IF NOT EXISTS "dispositionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lastEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stale" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "kelly_calendar"."OperationalConflictAction"
  ADD COLUMN IF NOT EXISTS "disposition" TEXT;

CREATE INDEX IF NOT EXISTS "OperationalConflictRecord_campaign_status_stale_idx"
  ON "kelly_calendar"."OperationalConflictRecord"("campaignKey", "status", "stale");

CREATE INDEX IF NOT EXISTS "OperationalConflictRecord_primaryEntityId_idx"
  ON "kelly_calendar"."OperationalConflictRecord"("primaryEntityId");

CREATE INDEX IF NOT EXISTS "OperationalConflictRecord_relatedEntityId_idx"
  ON "kelly_calendar"."OperationalConflictRecord"("relatedEntityId");
