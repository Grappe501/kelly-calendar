import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listSources } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Geography sources" };
export const dynamic = "force-dynamic";

export default async function GeographySourcesPage() {
  const actor = await requireActiveAuthenticatedActor();
  const sources = await listSources(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Geography sources</h1>
        <p>Provenance registry for IC-01 datasets.</p>
      </header>
      <section className="panel">
        {sources.length === 0 ? (
          <p className="muted">
            No sources seeded yet. Run geography:foundation:seed.
          </p>
        ) : (
          <ul className="plain-list">
            {sources.map((s) => (
              <li key={s.id}>
                <strong>{s.sourceKey}</strong> — {s.publisher}: {s.title}
                {s.vintage ? ` · ${s.vintage}` : ""}
                {s.contentFingerprint
                  ? ` · fp ${s.contentFingerprint.slice(0, 12)}…`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link className="button secondary" href="/system/geography">
        Back
      </Link>
    </div>
  );
}
