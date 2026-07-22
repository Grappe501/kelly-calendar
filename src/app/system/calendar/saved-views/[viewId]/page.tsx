import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getSavedViewForActor } from "@/server/services/calendar-saved-view-service";
import { applyRelativeDates, serializeCalendarQuery } from "@/lib/calendar/search";

export const metadata: Metadata = { title: "Saved view" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ viewId: string }> };

export default async function SavedViewDetailPage({ params }: Props) {
  const { viewId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  let payload;
  try {
    payload = await getSavedViewForActor({ actor, viewId });
  } catch {
    notFound();
  }
  const { view, resolvedQuery } = payload;
  const liveQuery = applyRelativeDates(resolvedQuery);
  const qs = serializeCalendarQuery({
    ...liveQuery,
    savedViewId: view.id,
    viewMode: view.viewMode ?? liveQuery.viewMode ?? "agenda",
  });
  const openHref =
    view.viewMode === "today"
      ? `/?${qs}`
      : `/calendar?view=${encodeURIComponent(view.viewMode ?? "agenda")}&${qs}`;

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">
          <Link href="/system/calendar/saved-views">← Saved views</Link>
        </p>
        <h1>{view.name}</h1>
        {view.description ? <p>{view.description}</p> : null}
        <p className="muted">
          {view.visibility} · schema v{view.querySchemaVersion}
          {view.staleState && view.staleState !== "CURRENT"
            ? ` · ${view.staleState}`
            : ""}
        </p>
      </header>

      <section className="panel">
        <p>
          <Link className="button" href={openHref}>
            Open in calendar
          </Link>
        </p>
        <p className="muted">
          Relative date modes (e.g. Today) resolve to the current campaign day,
          not the save date.
        </p>
        <pre className="code-block">{qs}</pre>
      </section>
    </div>
  );
}
