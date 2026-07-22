import type { Metadata } from "next";
import Link from "next/link";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

export const metadata: Metadata = {
  title: "Upload events & missions",
};

/**
 * Operator upload / intake hub for events and missions.
 * Manual create, templates, and calendar import land here.
 */
export default function UploadEventsPage() {
  const flags = getSharedAuthFlags();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Upload events &amp; missions</h1>
        <p>
          Bring schedule into the Campaign OS — create a live event, start from a template, or
          import from Google / iCal. Every item opens as a full editable sheet.
        </p>
      </header>

      {flags.candidateDataReady ? null : (
        <section className="dev-banner" role="status">
          DRAFT WORKFLOW ONLY — candidate-data certification incomplete. Imports may stage without
          writing the live schedule.
        </section>
      )}

      <section className="panel" aria-labelledby="create-heading">
        <h2 id="create-heading">Create</h2>
        <p className="muted">
          New events become missions automatically. After save you land on the full event sheet to
          add people, prep, travel notes, and follow-ups.
        </p>
        <div className="button-row">
          <Link className="button" href="/add/quick">
            Quick event entry
          </Link>
          <Link className="button secondary" href="/add/full">
            Full planning form
          </Link>
          <Link className="button secondary" href="/add/templates">
            Start from template
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="import-heading">
        <h2 id="import-heading">Import / upload</h2>
        <p className="muted">
          Pull history or a private calendar feed. Review staged rows before they become live
          Events.
        </p>
        <div className="button-row">
          <Link className="button" href="/import/google-calendar">
            Google Calendar / iCal import
          </Link>
          <Link className="button secondary" href="/import/google-calendar/history">
            Import history
          </Link>
          <Link className="button secondary" href="/system/imports">
            Import status
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="open-heading">
        <h2 id="open-heading">Open existing</h2>
        <p className="muted">
          From Today, Day, Week, Month, or Agenda — click any entry to open its full sheet (edit,
          cancel, archive, duplicate, add detail).
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/">
            Today
          </Link>
          <Link className="button secondary" href="/calendar?view=week">
            Week calendar
          </Link>
          <Link className="button secondary" href="/calendar?view=agenda">
            Agenda
          </Link>
          <Link className="button secondary" href="/system/missions">
            Missions index
          </Link>
        </div>
      </section>
    </div>
  );
}
