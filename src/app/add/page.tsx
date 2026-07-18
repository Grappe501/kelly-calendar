import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Add event",
};

const METHODS = [
  "Quick event",
  "Type event",
  "Speak event",
  "Scan invitation",
  "Import event",
] as const;

export default function AddPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Add</h1>
        <p>Event creation is not available in this scaffold.</p>
      </header>

      <section className="panel" aria-labelledby="step7-heading">
        <h2 id="step7-heading">Coming in Step 7</h2>
        <p>
          Manual event creation and editing ships in Step 7. AI-assisted creation ships later
          (Steps 16–17) and always requires human approval.
        </p>
        <div className="view-chips" role="list" aria-label="Planned creation methods">
          {METHODS.map((method) => (
            <span key={method} className="chip" role="listitem">
              {method}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="muted">
          Do not enter real candidate schedule information until authentication and database
          protections are implemented.
        </p>
        <div className="button-row" style={{ marginTop: "1rem" }}>
          <Link className="button secondary" href="/">
            Back to Today
          </Link>
        </div>
      </section>
    </div>
  );
}
