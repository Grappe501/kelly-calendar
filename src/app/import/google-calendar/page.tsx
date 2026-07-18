import type { Metadata } from "next";
import Link from "next/link";
import { GoogleImportPanel } from "@/components/imports/google-import-panel";

export const metadata: Metadata = {
  title: "Import Google Calendar",
};

export default function GoogleCalendarImportPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Import Google Calendar</h1>
        <p>
          Fetch historical events from November 1, 2025 onward. Normalize, deduplicate, stage, and
          review — never write blindly to RedDirt.
        </p>
      </header>
      <GoogleImportPanel />
      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/import/google-calendar/review">
            Review queue
          </Link>
          <Link className="button secondary" href="/import/google-calendar/history">
            Import history
          </Link>
        </div>
      </section>
    </div>
  );
}
