import type { Metadata } from "next";
import Link from "next/link";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

export const metadata: Metadata = {
  title: "Add event",
};

export default function AddPage() {
  const flags = getSharedAuthFlags();
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Add</h1>
        <p>
          {flags.candidateDataReady
            ? "Create a live calendar Event quickly, then add detail. Full planner draft staging remains available."
            : "Fast structured entry with drafts staged on H-drive. Real candidate schedule persistence is not yet certified."}
        </p>
      </header>

      {flags.candidateDataReady ? null : (
        <section className="dev-banner" role="status">
          DRAFT WORKFLOW ONLY — candidate-data certification incomplete.
        </section>
      )}

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
