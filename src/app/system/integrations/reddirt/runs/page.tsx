import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listRedDirtRuns } from "@/server/services/reddirt-integration-service";

export const metadata: Metadata = { title: "RedDirt runs" };
export const dynamic = "force-dynamic";

export default async function RedDirtRunsPage() {
  await requireSystemAdminPage("/system/integrations/reddirt/runs");
  const actor = await requireActiveAuthenticatedActor();
  const runs = await listRedDirtRuns(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>RedDirt sync runs</h1>
        <p>Dry-run and apply history. Page views never create runs.</p>
      </header>
      <section className="panel">
        {runs.length === 0 ? (
          <p>No runs yet.</p>
        ) : (
          <ul className="plain-list">
            {runs.map((r) => (
              <li key={r.id}>
                <Link href={`/system/integrations/reddirt/runs/${r.id}`}>
                  {r.startedAt} · {r.mode} · {r.status} · examined{" "}
                  {r.remoteExaminedCount}
                </Link>
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
