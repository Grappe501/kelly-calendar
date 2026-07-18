import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Add event",
};

export default function AddPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Add</h1>
        <p>
          Fast structured entry with drafts staged on H-drive. Nothing is live on the Command
          Calendar yet.
        </p>
      </header>

      <section className="dev-banner" role="status">
        DRAFT WORKFLOW ONLY — authentication and protected database persistence are not complete.
      </section>

      <section className="panel">
        <div className="button-row">
          <Link className="button" href="/add/quick">
            Quick entry
          </Link>
          <Link className="button secondary" href="/add/full">
            Full planning form
          </Link>
          <Link className="button secondary" href="/add/templates">
            Templates
          </Link>
          <Link className="button secondary" href="/import/google-calendar">
            Import Google Calendar history
          </Link>
        </div>
      </section>
    </div>
  );
}
