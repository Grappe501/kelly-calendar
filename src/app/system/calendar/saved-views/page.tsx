import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listSavedViewsForActor } from "@/server/services/calendar-saved-view-service";

export const metadata: Metadata = { title: "Saved views" };
export const dynamic = "force-dynamic";

export default async function SavedViewsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const { views } = await listSavedViewsForActor({ actor });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Saved views</h1>
        <p className="muted">
          Private and campaign-shared filter definitions. Opening a view never
          grants Event access beyond your permissions.
        </p>
      </header>

      {views.length === 0 ? (
        <section className="panel">
          <p className="muted">No saved views yet. Save one from any calendar surface.</p>
        </section>
      ) : (
        <ul className="agenda-list">
          {views.map((view) => (
            <li key={view.id}>
              <Link href={`/system/calendar/saved-views/${view.id}`}>
                {view.name}
              </Link>
              <p className="muted">
                {view.visibility}
                {view.isPinned ? " · pinned" : ""}
                {view.isDefault ? " · default" : ""}
                {view.staleState && view.staleState !== "CURRENT"
                  ? ` · ${view.staleState}`
                  : ""}
                {view.archivedAt ? " · archived" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
