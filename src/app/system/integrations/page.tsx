import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Integrations",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function IntegrationsIndexPage() {
  await requireSystemAdminPage("/system/integrations");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Integrations</h1>
        <p>Provider connections for campaign operations. Secrets stay server-only.</p>
      </header>
      <section className="panel">
        <ul>
          <li>
            <Link href="/system/integrations/mobilize">Mobilize</Link> — event
            reconcile foundation (D16)
          </li>
          <li>
            <Link href="/system/google-integration">Google Calendar</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
