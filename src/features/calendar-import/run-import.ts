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
import { requirePrivateGoogleIcalUrl } from "@/features/calendar-import/private-ical-env";
import { fetchGooglePrivateIcal } from "@/features/calendar-import/providers/google-private-ical";
import { fetchGooglePublicIcal } from "@/features/calendar-import/providers/google-public-ical";
import {
  assertImportFloor,
  validatePrivateGoogleIcalSource,
  validatePublicGoogleIcalSource,
} from "@/features/calendar-import/source-validation";
import {
  getNormalizedEvents,
  listImportManifests,
  stageGoogleImport,
} from "@/features/calendar-import/staging-store";
import type { GoogleImportSourceType } from "@/features/calendar-import/import-types";

export type RunImportInput = {
  sourceUrl: string;
  sourceLabel: string;
  range: ImportRangeOptions;
  mode: "preview" | "stage";
  requestId?: string;
};

type RunIcalPipelineInput = {
  sourceType: Extract<GoogleImportSourceType, "PUBLIC_ICAL" | "PRIVATE_ICAL_ENV">;
  sourceLabel: string;
  range: ImportRangeOptions;
  mode: "preview" | "stage";
  requestId?: string;
  sourceFingerprint: string;
  fetchBody: () => Promise<{
    body: string;
    sourceFingerprint: string;
    redactedLabel: string;
  }>;
};

async function runGoogleIcalPipeline(input: RunIcalPipelineInput) {
  assertImportFloor(input.range.startsAt);

  const manifest = createImportManifest({
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    sourceFingerprint: input.sourceFingerprint,
    startsAt: input.range.startsAt,
    endsAt: input.range.endsAt,
  });

  const fetched = await input.fetchBody();
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
      sourceType: input.sourceType,
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
      calendarFeedConfigured: true,
      sourceType: input.sourceType,
      redactedSource: fetched.redactedLabel,
      sourceFingerprint: fetched.sourceFingerprint,
      historicalFloor: HISTORICAL_IMPORT_FLOOR,
      databaseWriteAttempted: false as const,
      pushSupported: false as const,
      syncDirection: "IMPORT_ONLY" as const,
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
    calendarFeedConfigured: true,
    sourceType: input.sourceType,
    redactedSource: fetched.redactedLabel,
    sourceFingerprint: fetched.sourceFingerprint,
    historicalFloor: HISTORICAL_IMPORT_FLOOR,
    databaseWriteAttempted: false as const,
    pushSupported: false as const,
    syncDirection: "IMPORT_ONLY" as const,
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

export async function runGooglePublicIcalImport(input: RunImportInput) {
  const validated = validatePublicGoogleIcalSource(input.sourceUrl);
  return runGoogleIcalPipeline({
    sourceType: "PUBLIC_ICAL",
    sourceLabel: input.sourceLabel || "Google Calendar public iCal",
    range: input.range,
    mode: input.mode,
    requestId: input.requestId,
    sourceFingerprint: validated.sourceFingerprint,
    fetchBody: () => fetchGooglePublicIcal(input.sourceUrl, input.requestId),
  });
}

/**
 * Private/secret iCal ingest — URL is read only from server env.
 * Never accepts a client-supplied secret address.
 */
export async function runGooglePrivateIcalEnvImport(input: {
  sourceLabel?: string;
  range: ImportRangeOptions;
  mode: "preview" | "stage";
  requestId?: string;
}) {
  const sourceUrl = requirePrivateGoogleIcalUrl();
  const validated = validatePrivateGoogleIcalSource(sourceUrl);
  return runGoogleIcalPipeline({
    sourceType: "PRIVATE_ICAL_ENV",
    sourceLabel: input.sourceLabel || "Kelly private Google Calendar (env)",
    range: input.range,
    mode: input.mode,
    requestId: input.requestId,
    sourceFingerprint: validated.sourceFingerprint,
    fetchBody: () => fetchGooglePrivateIcal(sourceUrl, input.requestId),
  });
}
