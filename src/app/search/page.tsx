"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarSearchChromeHost } from "@/components/calendar/search/CalendarSearchChromeHost";

type Hit = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  dateKey: string;
  href: string;
  calendarName?: string;
  locationLabel?: string | null;
  matchReasons?: Array<{ label: string; snippet?: string }>;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(qs);
    if (!params.get("relativeDateMode") && !params.get("dateFrom")) {
      params.set("relativeDateMode", "NEXT_N_DAYS");
      params.set("forwardDays", "90");
    }
    params.set("viewMode", "search");
    fetch(`/api/calendar/search?${params.toString()}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setError(data?.error?.publicMessage ?? "Search failed.");
          setHits([]);
          setTotal(0);
          return;
        }
        setHits(data.results ?? []);
        setTotal(data.totalUniqueEvents ?? 0);
        setTruncated(Boolean(data.truncated));
      })
      .catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        setError("Search failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [qs]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Search</h1>
        <p className="executive-question">
          Permission-aware calendar search across the campaign schedule.
        </p>
      </header>

      <CalendarSearchChromeHost resultCount={total} truncated={truncated} />

      {loading ? <p className="muted">Searching…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error && hits.length === 0 ? (
        <section className="panel">
          <p className="muted">No matching events for this query.</p>
        </section>
      ) : null}

      {hits.length > 0 ? (
        <ol className="agenda-list">
          {hits.map((hit) => (
            <li key={hit.eventId}>
              <div className="agenda-row">
                <time dateTime={hit.startsAt}>{hit.dateKey}</time>
                <div>
                  <Link href={hit.href}>{hit.title}</Link>
                  <p className="muted">
                    {hit.calendarName}
                    {hit.locationLabel ? ` · ${hit.locationLabel}` : ""}
                  </p>
                  {hit.matchReasons?.length ? (
                    <p className="muted">
                      Matched:{" "}
                      {hit.matchReasons.map((r) => r.label).join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
