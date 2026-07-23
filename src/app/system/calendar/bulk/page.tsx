import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listRecentBulkOperations } from "@/server/services/calendar-bulk-operation-service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Calendar bulk operations" };

export default async function BulkOperationsIndexPage() {
  const actor = await requireActiveAuthenticatedActor();
  const { operations } = await listRecentBulkOperations({
    actor,
    limit: 30,
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Bulk operations</h1>
        <p className="muted">
          Previewed, permission-aware archive / restore / cancel and calendar membership
          batches. Selection alone never mutates.
        </p>
      </header>
      <p>
        <Link className="chip chip-link" href="/calendar?view=agenda">
          Select from Agenda
        </Link>{" "}
        <Link className="chip chip-link" href="/system/calendar/health">
          Health
        </Link>
      </p>
      <section className="panel">
        <h2>Recent operations</h2>
        {operations.length === 0 ? (
          <p className="muted">No bulk operations yet.</p>
        ) : (
          <ul>
            {operations.map((op) => (
              <li key={op.id}>
                <Link href={`/system/calendar/bulk/${op.id}`}>
                  {op.actionType} · {op.status} · {op.totalCount} items ·{" "}
                  {op.succeededCount} ok · {op.failedCount} failed
                </Link>
                <span className="muted"> · {op.createdAt}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
