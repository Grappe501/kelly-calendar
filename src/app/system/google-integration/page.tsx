import type { Metadata } from "next";
import Link from "next/link";
import { GoogleIntegrationPanel } from "@/components/integrations/google-integration-panel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Google Calendar integration",
};

export const dynamic = "force-dynamic";

export default async function GoogleIntegrationPage() {
  await requireSystemAdminPage("/system/google-integration");

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Google Calendar &amp; Routes</h1>
        <p>
          Secure read-only OAuth, historical import staging, and estimated campaign route mileage.
        </p>
      </header>
      <GoogleIntegrationPanel />
      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/imports">
            Import system
          </Link>
          <Link className="button secondary" href="/import/google-calendar">
            iCal import panel
          </Link>
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
        </div>
      </section>
    </div>
  );
}
