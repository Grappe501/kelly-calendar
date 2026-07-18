import { randomUUID } from "node:crypto";
import type {
  GoogleCalendarImportManifest,
  GoogleImportSourceType,
} from "@/features/calendar-import/import-types";
import { IMPORT_TIMEZONE } from "@/features/calendar-import/import-limits";

export function createImportManifest(input: {
  sourceType: GoogleImportSourceType;
  sourceLabel: string;
  sourceFingerprint: string;
  startsAt: string;
  endsAt: string;
}): GoogleCalendarImportManifest {
  return {
    importId: `imp_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
    sourceFingerprint: input.sourceFingerprint,
    requestedRange: {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: IMPORT_TIMEZONE,
    },
    fetchedAt: new Date().toISOString(),
    counts: {
      fetched: 0,
      parsed: 0,
      normalized: 0,
      staged: 0,
      duplicates: 0,
      rejected: 0,
      recurringMasters: 0,
      recurringInstances: 0,
      allDayEvents: 0,
      cancelledEvents: 0,
    },
    databaseWriteAttempted: false,
    migrationAttempted: false,
    operatorReviewRequired: true,
    status: "STARTED",
  };
}

/** Ensure secrets never appear in manifests. */
export function assertManifestSafe(manifest: GoogleCalendarImportManifest): void {
  const json = JSON.stringify(manifest);
  if (/calendar\/ical\/[^/"]+/i.test(json) && json.includes("private")) {
    throw new Error("Manifest appears to contain a private iCal path segment");
  }
  if (/https:\/\/calendar\.google\.com\/calendar\/ical\//i.test(json)) {
    throw new Error("Manifest must not contain full Google iCal URLs");
  }
}
