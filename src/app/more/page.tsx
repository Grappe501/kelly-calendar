import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_STEP_ID, CURRENT_STEP_NUMBER, TOTAL_STEPS } from "@/lib/system/capabilities";

export const metadata: Metadata = {
  title: "More",
};

export default function MorePage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>More</h1>
        <p>System links and build context for operators.</p>
      </header>

      <section className="panel">
        <h2>Build status</h2>
        <ul className="status-list">
          <li>
            <span>Current step</span>
            <strong>
              {CURRENT_STEP_NUMBER} of {TOTAL_STEPS}
            </strong>
          </li>
          <li>
            <span>Step ID</span>
            <strong>{CURRENT_STEP_ID}</strong>
          </li>
          <li>
            <span>Next step</span>
            <strong>KCCC-STEP-03-ENV-SECURITY</strong>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>System</h2>
        <div className="button-row">
          <Link className="button secondary" href="/system/status">
            System status page
          </Link>
          <Link className="button secondary" href="/api/health">
            Health endpoint (JSON)
          </Link>
          <Link className="button secondary" href="/api/system/status">
            Status endpoint (JSON)
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Privacy classification</h2>
        <p>
          This application is an <strong>internal campaign operations tool</strong>. It is not a
          public calendar. Do not publish candidate schedule data. Authentication and role-based
          access arrive in Step 4.
        </p>
      </section>

      <section className="panel">
        <h2>Settings placeholders</h2>
        <p className="muted">
          Notification preferences, external calendar connections, and role management will appear
          in later steps.
        </p>
      </section>
    </div>
  );
}
