import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getRedDirtGeographySummary } from "@/server/services/reddirt-integration-service";

export const metadata: Metadata = { title: "RedDirt strategic geography" };
export const dynamic = "force-dynamic";

export default async function RedDirtGeographyPage() {
  await requireSystemAdminPage("/system/integrations/reddirt/geography");
  const actor = await requireActiveAuthenticatedActor();
  const summary = await getRedDirtGeographySummary(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Strategic geography facts</h1>
        <p>
          Applied RedDirt-sourced facts only. Values remain labeled
          RedDirt-sourced — not objective system truth. Active:{" "}
          {summary.activeFactCount}.
        </p>
      </header>
      <section className="panel">
        {summary.facts.length === 0 ? (
          <p>No applied strategic facts yet (expected when NOT_CONFIGURED).</p>
        ) : (
          <ul className="plain-list">
            {summary.facts.map((f) => (
              <li key={f.id}>
                {f.factKind} = {f.factValue} · {f.sourceAttributionLabel} ·
                county {f.arkansasCountyId ?? "—"} · place{" "}
                {f.geographyPlaceAuthorityId ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link className="button secondary" href="/system/integrations/reddirt">
        Back
      </Link>
    </div>
  );
}
