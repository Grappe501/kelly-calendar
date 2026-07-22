-- CC-04 Recurrence & Occurrence Exceptions

CREATE TYPE "kelly_calendar"."CalendarRecurrenceSeriesStatus" AS ENUM (
  'ACTIVE',
  'ENDED',
  'CANCELLED',
  'ARCHIVED'
);

CREATE TYPE "kelly_calendar"."CalendarOccurrenceExceptionType" AS ENUM (
  'MODIFIED',
  'CANCELLED',
  'EXCLUDED',
  'ADDED',
  'DETACHED'
);

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarRecurrenceSeries" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "primaryCalendarId" TEXT,
  "templateEventId" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "isAllDay" BOOLEAN NOT NULL DEFAULT false,
  "baseLocalStart" TEXT NOT NULL,
  "baseDurationMinutes" INTEGER NOT NULL,
  "rruleOriginal" TEXT NOT NULL,
  "rruleNormalized" TEXT NOT NULL,
  "ruleFingerprint" TEXT NOT NULL,
  "dtstartLocal" TEXT NOT NULL,
  "untilLocal" TEXT,
  "countLimit" INTEGER,
  "wkst" TEXT,
  "dstDisambiguation" TEXT NOT NULL DEFAULT 'EARLIER',
  "status" "kelly_calendar"."CalendarRecurrenceSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
  "materializationHorizonEnd" TIMESTAMP(3),
  "materializationVersion" INTEGER NOT NULL DEFAULT 1,
  "sourceSystem" TEXT,
  "externalUid" TEXT,
  "externalRecurringEventId" TEXT,
  "unsupportedComponents" TEXT[],
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "CalendarRecurrenceSeries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarRecurrenceSeries_campaignKey_status_idx"
  ON "kelly_calendar"."CalendarRecurrenceSeries"("campaignKey", "status");
CREATE INDEX IF NOT EXISTS "CalendarRecurrenceSeries_ruleFingerprint_idx"
  ON "kelly_calendar"."CalendarRecurrenceSeries"("ruleFingerprint");
CREATE INDEX IF NOT EXISTS "CalendarRecurrenceSeries_externalUid_idx"
  ON "kelly_calendar"."CalendarRecurrenceSeries"("externalUid");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarOccurrenceException" (
  "id" TEXT NOT NULL,
  "seriesId" TEXT NOT NULL,
  "occurrenceKey" TEXT NOT NULL,
  "originalOccurrenceAt" TIMESTAMP(3) NOT NULL,
  "exceptionType" "kelly_calendar"."CalendarOccurrenceExceptionType" NOT NULL,
  "eventId" TEXT,
  "overrideStartsAt" TIMESTAMP(3),
  "overrideEndsAt" TIMESTAMP(3),
  "overrideIsAllDay" BOOLEAN,
  "overrideTitle" TEXT,
  "overrideTimezone" TEXT,
  "reason" TEXT,
  "sourceSystem" TEXT,
  "externalRecurrenceId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "restoredAt" TIMESTAMP(3),
  CONSTRAINT "CalendarOccurrenceException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarOccurrenceException_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "kelly_calendar"."CalendarRecurrenceSeries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CalendarOccurrenceException_seriesId_occurrenceKey_key"
  ON "kelly_calendar"."CalendarOccurrenceException"("seriesId", "occurrenceKey");
CREATE INDEX IF NOT EXISTS "CalendarOccurrenceException_eventId_idx"
  ON "kelly_calendar"."CalendarOccurrenceException"("eventId");
CREATE INDEX IF NOT EXISTS "CalendarOccurrenceException_exceptionType_idx"
  ON "kelly_calendar"."CalendarOccurrenceException"("exceptionType");

CREATE INDEX IF NOT EXISTS "Event_recurrenceSeriesId_idx"
  ON "kelly_calendar"."Event"("recurrenceSeriesId");
CREATE INDEX IF NOT EXISTS "Event_recurrenceSeriesId_originalOccurrenceAt_idx"
  ON "kelly_calendar"."Event"("recurrenceSeriesId", "originalOccurrenceAt");
