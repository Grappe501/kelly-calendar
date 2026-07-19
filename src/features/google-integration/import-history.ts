import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  fetchAllGoogleCalendarEvents,
  incrementalGoogleCalendarSync,
  type GoogleCalendarEvent,
} from "@/features/google-integration/calendar-api-client";
import { getGoogleIntegrationEnv } from "@/features/google-integration/config";
import { refreshAccessToken } from "@/features/google-integration/google-oauth-client";
import { reconcileGoogleEvent } from "@/features/google-integration/reconcile";
import {
  decryptRefreshToken,
  getActiveConnection,
} from "@/features/google-integration/token-store";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/lib/security/safe-error";

export type ImportHistoryOptions = {
  fromIso?: string;
  toIso?: string;
  apply?: boolean;
  mode?: "history" | "sync";
  reviewDir?: string;
};

export type ImportHistoryReport = {
  mode: "history" | "sync";
  dryRun: boolean;
  skippedSafely?: boolean;
  reason?: string;
  eventsRead: number;
  newCandidates: number;
  updates: number;
  cancellations: number;
  possibleDuplicates: number;
  privateEvents: number;
  recurringInstances: number;
  errors: number;
  recordsThatWouldChange: number;
  applied: number;
  nextSyncTokenPresent: boolean;
};

function fingerprintGoogleEvent(event: GoogleCalendarEvent): string {
  return createHash("sha256")
    .update(
      [
        event.id,
        event.iCalUID ?? "",
        event.updated ?? "",
        event.status ?? "",
        event.start?.dateTime ?? event.start?.date ?? "",
        event.end?.dateTime ?? event.end?.date ?? "",
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 32);
}

function isPrivateVisibility(event: GoogleCalendarEvent): boolean {
  return event.visibility === "private" || event.visibility === "confidential";
}

async function loadAccessToken() {
  const connection = await getActiveConnection();
  if (!connection || connection.connectionStatus !== "CONNECTED") {
    return { connection: null, accessToken: null as string | null };
  }
  const refreshToken = decryptRefreshToken(connection);
  const tokens = await refreshAccessToken(refreshToken);
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { lastTokenRefreshAt: new Date() },
  });
  return { connection, accessToken: tokens.access_token };
}

export async function runGoogleCalendarImport(
  options: ImportHistoryOptions = {},
): Promise<ImportHistoryReport> {
  const env = getGoogleIntegrationEnv();
  const dryRun = options.apply !== true;
  const mode = options.mode ?? "history";

  if (!env.syncEnabled && options.apply) {
    return {
      mode,
      dryRun: true,
      skippedSafely: true,
      reason: "KCCC_GOOGLE_SYNC_ENABLED is false",
      eventsRead: 0,
      newCandidates: 0,
      updates: 0,
      cancellations: 0,
      possibleDuplicates: 0,
      privateEvents: 0,
      recurringInstances: 0,
      errors: 0,
      recordsThatWouldChange: 0,
      applied: 0,
      nextSyncTokenPresent: false,
    };
  }

  const { connection, accessToken } = await loadAccessToken();
  if (!connection || !accessToken) {
    return {
      mode,
      dryRun,
      skippedSafely: true,
      reason: "Google OAuth connection not available",
      eventsRead: 0,
      newCandidates: 0,
      updates: 0,
      cancellations: 0,
      possibleDuplicates: 0,
      privateEvents: 0,
      recurringInstances: 0,
      errors: 0,
      recordsThatWouldChange: 0,
      applied: 0,
      nextSyncTokenPresent: false,
    };
  }

  const fromIso = options.fromIso ?? env.historyStartIso;
  const toIso = options.toIso ?? new Date().toISOString();

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: { lastSyncStartedAt: new Date(), lastSyncStatus: "PENDING" },
  });

  let items: GoogleCalendarEvent[] = [];
  let nextSyncToken: string | undefined;

  try {
    if (mode === "sync") {
      if (!connection.syncCursor) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          status: 400,
          publicMessage: "No sync cursor. Run historical import first.",
        });
      }
      const result = await incrementalGoogleCalendarSync({
        accessToken,
        calendarId: connection.googleCalendarId,
        syncToken: connection.syncCursor,
      });
      items = result.items;
      nextSyncToken = result.nextSyncToken;
    } else {
      const result = await fetchAllGoogleCalendarEvents({
        accessToken,
        calendarId: connection.googleCalendarId,
        timeMin: new Date(fromIso).toISOString(),
        timeMax: new Date(toIso).toISOString(),
      });
      items = result.items;
      nextSyncToken = result.nextSyncToken;
    }
  } catch (error) {
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncStatus: "ERROR",
        lastSyncErrorCode: "FETCH_FAILED",
      },
    });
    throw error;
  }

  const identities = await prisma.externalEventIdentity.findMany({
    where: { provider: "GOOGLE_CALENDAR", deletedAt: null },
    select: {
      id: true,
      externalEventId: true,
      iCalUid: true,
      fingerprint: true,
      canonicalEventId: true,
    },
  });
  const byExternalId = new Map(
    identities.filter((i) => i.externalEventId).map((i) => [i.externalEventId!, i]),
  );

  const events = await prisma.event.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      eventNumber: true,
      internalTitle: true,
      startsAt: true,
      externalIdentities: {
        select: { externalEventId: true, iCalUid: true },
      },
    },
    take: 5000,
  });
  const candidates = events.map((e) => ({
    eventId: e.id,
    eventNumber: e.eventNumber,
    title: e.internalTitle,
    startsAt: e.startsAt,
    externalEventId: e.externalIdentities.find((x) => x.externalEventId)?.externalEventId ?? null,
    iCalUid: e.externalIdentities.find((x) => x.iCalUid)?.iCalUid ?? null,
  }));

  let newCandidates = 0;
  let updates = 0;
  let cancellations = 0;
  let possibleDuplicates = 0;
  let privateEvents = 0;
  let recurringInstances = 0;
  let recordsThatWouldChange = 0;
  let applied = 0;
  const errors = 0;

  const reviewRows: Array<Record<string, unknown>> = [];

  let externalSource = connection.externalSourceId
    ? await prisma.externalCalendarSource.findUnique({ where: { id: connection.externalSourceId } })
    : null;
  if (!externalSource && !dryRun) {
    externalSource = await prisma.externalCalendarSource.create({
      data: {
        provider: "GOOGLE_CALENDAR",
        sourceType: "GOOGLE_OAUTH_READONLY",
        displayName: "Kelly Google Calendar (OAuth)",
        sourceFingerprint: `google-oauth:${connection.id}`,
        syncDirection: "IMPORT_ONLY",
        syncStatus: "ACTIVE",
        historicalFloor: new Date(env.historyStartIso),
        createdByUserId: connection.connectedByUserId,
      },
    });
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { externalSourceId: externalSource.id },
    });
  }

  const importRun =
    !dryRun && externalSource
      ? await prisma.calendarImportRun.create({
          data: {
            externalSourceId: externalSource.id,
            requestedStart: new Date(fromIso),
            requestedEnd: new Date(toIso),
            status: "STARTED",
            operatorUserId: connection.connectedByUserId,
            manifestJson: { mode, dryRun: false, source: "GOOGLE_OAUTH" },
          },
        })
      : null;

  for (const item of items) {
    if (isPrivateVisibility(item)) privateEvents += 1;
    if (item.recurringEventId) recurringInstances += 1;
    if (item.status === "cancelled") cancellations += 1;

    const fp = fingerprintGoogleEvent(item);
    const existingIdentity = byExternalId.get(item.id);
    const reconcile = reconcileGoogleEvent(item, candidates);
    if (
      reconcile.status === "REVIEW_POSSIBLE_MATCH" ||
      reconcile.status === "SOURCE_CONFLICT"
    ) {
      possibleDuplicates += 1;
    }

    if (!existingIdentity) newCandidates += 1;
    else if (existingIdentity.fingerprint !== fp) updates += 1;

    const wouldChange = !existingIdentity || existingIdentity.fingerprint !== fp;
    if (wouldChange) recordsThatWouldChange += 1;

    reviewRows.push({
      googleEventId: item.id,
      iCalUid: item.iCalUID ?? null,
      status: item.status ?? null,
      summary: item.summary ?? null,
      start: item.start ?? null,
      end: item.end ?? null,
      location: item.location ?? null,
      visibility: item.visibility ?? null,
      reconcileStatus: reconcile.status,
      wouldChange,
      // descriptions intentionally omitted from default review summary
    });

    if (!dryRun && importRun && externalSource && wouldChange) {
      await prisma.calendarImportRecord.create({
        data: {
          importRunId: importRun.id,
          rawFingerprint: fp,
          reviewStatus: "UNREVIEWED",
          duplicateStatus:
            reconcile.status === "AUTO_MATCH_HIGH_CONFIDENCE"
              ? "LIKELY_DUPLICATE"
              : reconcile.status === "NO_MATCH"
                ? "NEW"
                : "NEEDS_REVIEW",
          googleReconcileStatus: reconcile.status,
          canonicalEventId: reconcile.matchedEventId ?? null,
          normalizedPayload: {
            sourceSystem: "GOOGLE_CALENDAR",
            sourceCalendarId: connection.googleCalendarId,
            sourceEventId: item.id,
            sourceRecurringEventId: item.recurringEventId ?? null,
            iCalUid: item.iCalUID ?? null,
            status: item.status ?? null,
            summary: item.summary ?? null,
            location: item.location ?? null,
            start: item.start ?? null,
            end: item.end ?? null,
            created: item.created ?? null,
            updated: item.updated ?? null,
            organizerEmail: item.organizer?.email ?? null,
            attendeeCount: item.attendees?.length ?? 0,
            visibility: item.visibility ?? null,
            transparency: item.transparency ?? null,
            eventType: item.eventType ?? null,
            hasConference: Boolean(item.hangoutLink || item.conferenceData),
            // enrichment fields intentionally absent — KCCC-owned
          },
          reviewNotes: `IMPORTED_UNREVIEWED via Google OAuth (${mode})`,
        },
      });

      await prisma.externalEventIdentity.upsert({
        where: {
          externalSourceId_fingerprint: {
            externalSourceId: externalSource.id,
            fingerprint: fp,
          },
        },
        create: {
          provider: "GOOGLE_CALENDAR",
          externalSourceId: externalSource.id,
          externalEventId: item.id,
          iCalUid: item.iCalUID ?? null,
          recurringEventId: item.recurringEventId ?? null,
          sourceUpdatedAt: item.updated ? new Date(item.updated) : null,
          fingerprint: fp,
          canonicalEventId: reconcile.matchedEventId ?? null,
          deletedAt: item.status === "cancelled" ? new Date() : null,
        },
        update: {
          externalEventId: item.id,
          iCalUid: item.iCalUID ?? null,
          recurringEventId: item.recurringEventId ?? null,
          sourceUpdatedAt: item.updated ? new Date(item.updated) : null,
          deletedAt: item.status === "cancelled" ? new Date() : null,
        },
      });
      applied += 1;
    }
  }

  if (!dryRun && importRun) {
    await prisma.calendarImportRun.update({
      where: { id: importRun.id },
      data: {
        status: "STAGED",
        completedAt: new Date(),
        fetchedCount: items.length,
        parsedCount: items.length,
        normalizedCount: items.length,
        stagedCount: applied,
        duplicateCount: possibleDuplicates,
        errorCount: errors,
      },
    });
  }

  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncCompletedAt: new Date(),
      lastSyncStatus: "ACTIVE",
      lastSyncErrorCode: null,
      syncCursor: nextSyncToken ?? connection.syncCursor,
      historicalImportedThrough: mode === "history" ? new Date(toIso) : connection.historicalImportedThrough,
      pendingReconcileCount: possibleDuplicates,
    },
  });

  const reviewDir =
    options.reviewDir ??
    path.join(process.cwd(), "data", "private", "google-calendar-review");
  if (!dryRun || process.env.KCCC_WRITE_GOOGLE_REVIEW_ARTIFACT === "true") {
    fs.mkdirSync(reviewDir, { recursive: true });
    const file = path.join(
      reviewDir,
      `${mode}-${dryRun ? "dryrun" : "apply"}-${Date.now()}.json`,
    );
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode,
          dryRun,
          counts: {
            eventsRead: items.length,
            newCandidates,
            updates,
            cancellations,
            possibleDuplicates,
            privateEvents,
            recurringInstances,
            applied,
          },
          // summaries only — no descriptions
          rows: reviewRows.slice(0, 500),
        },
        null,
        2,
      ),
    );
  }

  return {
    mode,
    dryRun,
    eventsRead: items.length,
    newCandidates,
    updates,
    cancellations,
    possibleDuplicates,
    privateEvents,
    recurringInstances,
    errors,
    recordsThatWouldChange,
    applied,
    nextSyncTokenPresent: Boolean(nextSyncToken),
  };
}
