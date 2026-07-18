import { randomUUID } from "node:crypto";
import { deduplicateEvents } from "@/features/calendar-import/deduplicate-events";
import { expandSimpleRecurrence } from "@/features/calendar-import/expand-recurrence";
import { HISTORICAL_IMPORT_FLOOR } from "@/features/calendar-import/import-limits";
import { createImportManifest } from "@/features/calendar-import/import-manifest";
import type {
  ImportRangeOptions,
  StagedCalendarEvent,
} from "@/features/calendar-import/import-types";
import { normalizeParsedEvent } from "@/features/calendar-import/normalize-google-event";
import { parseIcalEvents } from "@/features/calendar-import/parse-ical";
import { fetchGooglePublicIcal } from "@/features/calendar-import/providers/google-public-ical";
import {
  assertImportFloor,
  validatePublicGoogleIcalSource,
} from "@/features/calendar-import/source-validation";
import {
  getNormalizedEvents,
  listImportManifests,
  stageGoogleImport,
} from "@/features/calendar-import/staging-store";

export type RunImportInput = {
  sourceUrl: string;
  sourceLabel: string;
  range: ImportRangeOptions;
  mode: "preview" | "stage";
  requestId?: string;
};

export async function runGooglePublicIcalImport(input: RunImportInput) {
  assertImportFloor(input.range.startsAt);
  const validated = validatePublicGoogleIcalSource(input.sourceUrl);

  const manifest = createImportManifest({
    sourceType: "PUBLIC_ICAL",
    sourceLabel: input.sourceLabel || "Google Calendar public iCal",
    sourceFingerprint: validated.sourceFingerprint,
    startsAt: input.range.startsAt,
    endsAt: input.range.endsAt,
  });

  const fetched = await fetchGooglePublicIcal(input.sourceUrl, input.requestId);
  manifest.status = "FETCHED";
  manifest.counts.fetched = 1;

  let parsed = parseIcalEvents(fetched.body);
  manifest.counts.parsed = parsed.length;
  manifest.counts.recurringMasters = parsed.filter((e) => e.rrule).length;

  if (input.range.expandRecurring) {
    const expanded = parsed.flatMap((event) =>
      expandSimpleRecurrence(event, input.range.startsAt, input.range.endsAt),
    );
    manifest.counts.recurringInstances = Math.max(0, expanded.length - parsed.length);
    parsed = expanded;
  }

  const rejected: StagedCalendarEvent[] = [];
  const normalized: StagedCalendarEvent[] = [];

  for (const event of parsed) {
    const staged = normalizeParsedEvent({
      event,
      sourceType: "PUBLIC_ICAL",
      sourceLabel: manifest.sourceLabel,
      sourceFingerprint: fetched.sourceFingerprint,
      range: input.range,
      stagedEventId: `stg_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    });
    if (!staged) {
      manifest.counts.rejected += 1;
      continue;
    }
    if (staged.timing.allDay) manifest.counts.allDayEvents += 1;
    if (staged.basic.importedStatus === "CANCELLED") manifest.counts.cancelledEvents += 1;
    normalized.push(staged);
  }

  manifest.counts.normalized = normalized.length;
  manifest.status = "NORMALIZED";

  const prior = listImportManifests()
    .slice(0, 5)
    .flatMap((m) => getNormalizedEvents(m.importId));
  const deduped = deduplicateEvents(normalized, prior);
  const duplicateCount = deduped.filter((e) =>
    ["EXACT_DUPLICATE", "LIKELY_DUPLICATE", "POSSIBLE_DUPLICATE"].includes(
      e.deduplication.status,
    ),
  ).length;
  manifest.counts.duplicates = duplicateCount;

  if (input.mode === "preview") {
    return {
      mode: "preview" as const,
      sourceConfigured: true,
      redactedSource: fetched.redactedLabel,
      sourceFingerprint: fetched.sourceFingerprint,
      historicalFloor: HISTORICAL_IMPORT_FLOOR,
      databaseWriteAttempted: false as const,
      manifest,
      sample: deduped.slice(0, 25),
      totalNormalized: deduped.length,
      reviewQueueCount: deduped.filter((e) => e.review.status === "UNREVIEWED").length,
    };
  }

  const staged = stageGoogleImport({
    manifest: {
      ...manifest,
      counts: { ...manifest.counts, staged: deduped.length },
    },
    rawIcs: fetched.body,
    events: deduped,
    rejected,
  });

  return {
    mode: "stage" as const,
    sourceConfigured: true,
    redactedSource: fetched.redactedLabel,
    sourceFingerprint: fetched.sourceFingerprint,
    historicalFloor: HISTORICAL_IMPORT_FLOOR,
    databaseWriteAttempted: false as const,
    manifest: staged.manifest,
    importId: staged.importId,
    totalNormalized: deduped.length,
    reviewQueueCount: deduped.filter(
      (e) =>
        e.review.status === "UNREVIEWED" ||
        e.deduplication.status !== "NEW",
    ).length,
    stagingLocation: "data/ingest_staging",
  };
}
