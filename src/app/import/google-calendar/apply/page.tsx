import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getUnreviewedImportQueue } from "@/server/services/historical-import-service";
import { ImportApplyQueue } from "@/components/imports/ImportApplyQueue";
import { getImportStatusSummary } from "@/features/calendar-import/staging-store";

export const metadata: Metadata = {
  title: "Import apply queue",
};

export const dynamic = "force-dynamic";

function summaryFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Imported event";
  const p = payload as { summary?: unknown };
  return typeof p.summary === "string" && p.summary.trim()
    ? p.summary.trim()
    : "Imported event (untitled)";
}

function whenFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const p = payload as {
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
  };
  const start = p.start?.dateTime ?? p.start?.date ?? "?";
  const end = p.end?.dateTime ?? p.end?.date ?? "?";
  return `${start} → ${end}`;
}

export default async function ImportApplyReviewPage() {
  const actor = await requireActiveAuthenticatedActor();
  const queue = await getUnreviewedImportQueue(actor);
  const fileStaging = getImportStatusSummary();
  const rows = queue.map((r) => ({
    id: r.id,
    importRunId: r.importRunId,
    rawFingerprint: r.rawFingerprint,
    reviewStatus: r.reviewStatus,
    duplicateStatus: r.duplicateStatus,
    canonicalEventId: r.canonicalEventId,
    summary: summaryFromPayload(r.normalizedPayload),
    when: whenFromPayload(r.normalizedPayload),
  }));

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Import approval → canonical apply</h1>
        <p>
          CC-01: approve creates exactly one Event; re-approve is idempotent; merge and reject are
          audited. No Mission or external-calendar write-back.
        </p>
      </header>

      <section className="dev-banner" role="status">
        Database apply is enabled. File staging queue remains separate (
        {fileStaging.runCount} filesystem run(s)).
      </section>

      <section className="panel">
        <h2>Unreviewed database records</h2>
        <ImportApplyQueue initialRows={rows} />
      </section>

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/import/google-calendar">
            Google import panel
          </Link>
          <Link className="button secondary" href="/import/google-calendar/review">
            File staging review
          </Link>
          <Link className="button secondary" href="/system/imports">
            System imports
          </Link>
        </div>
      </section>
    </div>
  );
}
