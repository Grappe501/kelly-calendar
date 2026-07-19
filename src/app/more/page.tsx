import type { Metadata } from "next";
import Link from "next/link";
import {
  CURRENT_STEP_ID,
  CURRENT_STEP_NUMBER,
  TOTAL_STEPS,
} from "@/lib/system/constants";

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
            <strong>KCCC-STEP-07-CAMPAIGN-OPERATIONS</strong>
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>Command</h2>
        <div className="button-row">
          <Link className="button" href="/command">
            Executive Command
          </Link>
          <Link className="button" href="/field">
            Field Operations
          </Link>
          <Link className="button" href="/counties">
            County Operations
          </Link>
          <Link className="button secondary" href="/brief">
            Today’s Campaign Brief
          </Link>
          <Link className="button secondary" href="/">
            Today command
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>System</h2>
        <div className="button-row">
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
          <Link className="button secondary" href="/system/environment">
            Environment readiness
          </Link>
          <Link className="button secondary" href="/system/security">
            Security status
          </Link>
          <Link className="button secondary" href="/system/visibility">
            Calendar visibility
          </Link>
          <Link className="button secondary" href="/system/imports">
            Imports status
          </Link>
          <Link className="button secondary" href="/import/google-calendar">
            Google Calendar import
          </Link>
          <Link className="button secondary" href="/add/quick">
            Quick event entry
          </Link>
          <Link className="button secondary" href="/api/health">
            Health endpoint (JSON)
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Privacy classification</h2>
        <p>
          This application is an <strong>internal campaign operations tool</strong>. It is not a
          public calendar. Real candidate schedule information remains prohibited until
          authentication, role-based access control, and the protected calendar database layer are
          implemented and certified.
        </p>
      </section>
    </div>
  );
}
