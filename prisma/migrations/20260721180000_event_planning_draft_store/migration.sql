-- Persist full-planner event drafts in Postgres (Netlify has no durable filesystem).

CREATE TABLE IF NOT EXISTS "kelly_calendar"."EventPlanningDraft" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNING',
  "title" TEXT NOT NULL DEFAULT '',
  "primaryCalendar" TEXT NOT NULL DEFAULT 'Public Events',
  "payload" JSONB NOT NULL,
  "draftVersion" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventPlanningDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventPlanningDraft_updatedAt_idx"
  ON "kelly_calendar"."EventPlanningDraft"("updatedAt");

CREATE INDEX IF NOT EXISTS "EventPlanningDraft_status_idx"
  ON "kelly_calendar"."EventPlanningDraft"("status");
