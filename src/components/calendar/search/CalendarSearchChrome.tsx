"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

type FilterChip = { key: string; label: string; clearParam: string };

type Props = {
  /** Compact mode for Month — progressive disclosure. */
  compact?: boolean;
  resultCount?: number | null;
  truncated?: boolean;
};

const FILTER_DEFS: Array<{
  param: string;
  label: string;
  options?: Array<{ value: string; label: string }>;
}> = [
  {
    param: "statuses",
    label: "Status",
    options: [
      { value: "DRAFT", label: "Draft" },
      { value: "CONFIRMED", label: "Confirmed" },
      { value: "TENTATIVE", label: "Tentative" },
    ],
  },
  {
    param: "importedOnly",
    label: "Source",
    options: [
      { value: "1", label: "Imported" },
      { value: "0", label: "Local" },
    ],
  },
  {
    param: "missionLinked",
    label: "Mission",
    options: [
      { value: "1", label: "Mission-linked" },
      { value: "0", label: "Unlinked" },
    ],
  },
  {
    param: "allDayOnly",
    label: "Timing",
    options: [
      { value: "1", label: "All-day" },
      { value: "0", label: "Timed" },
    ],
  },
  {
    param: "recurringOnly",
    label: "Recurrence",
    options: [
      { value: "1", label: "Recurring" },
      { value: "0", label: "Non-recurring" },
    ],
  },
  {
    param: "conflictActive",
    label: "Conflicts",
    options: [{ value: "1", label: "Active conflicts" }],
  },
  {
    param: "includeCancelled",
    label: "History",
    options: [{ value: "1", label: "Include cancelled" }],
  },
  {
    param: "includeArchived",
    label: "Archived",
    options: [{ value: "1", label: "Include archived" }],
  },
];

function buildHref(base: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function CalendarSearchChrome({
  compact = false,
  resultCount = null,
  truncated = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [saveName, setSaveName] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [views, setViews] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/saved-views", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.views)) return;
        setViews(
          data.views.map((v: { id: string; name: string }) => ({
            id: v.id,
            name: v.name,
          })),
        );
      })
      .catch(() => {
        /* silent — chrome still works without switcher */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = [];
    if (searchParams.get("q")) {
      out.push({ key: "q", label: `Search: ${searchParams.get("q")}`, clearParam: "q" });
    }
    for (const def of FILTER_DEFS) {
      const val = searchParams.get(def.param);
      if (!val) continue;
      const opt = def.options?.find((o) => o.value === val);
      out.push({
        key: `${def.param}:${val}`,
        label: opt?.label ?? `${def.label}: ${val}`,
        clearParam: def.param,
      });
    }
    if (searchParams.get("countyIds")) {
      out.push({
        key: "countyIds",
        label: `County filter`,
        clearParam: "countyIds",
      });
    }
    if (searchParams.get("savedViewId")) {
      out.push({
        key: "savedViewId",
        label: "Saved view",
        clearParam: "savedViewId",
      });
    }
    return out;
  }, [searchParams]);

  const applyParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      next.delete("page");
      const path =
        typeof window !== "undefined" ? window.location.pathname : "/calendar";
      startTransition(() => {
        router.push(buildHref(path, next));
      });
    },
    [router, searchParams],
  );

  const commitSearch = useCallback(() => {
    applyParams((p) => {
      const trimmed = q.trim();
      if (trimmed) p.set("q", trimmed);
      else p.delete("q");
    });
  }, [applyParams, q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = (searchParams.get("q") ?? "").trim();
      if (q.trim() === current) return;
      commitSearch();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [q, commitSearch, searchParams]);

  const clearOne = (param: string) => {
    applyParams((p) => {
      p.delete(param);
    });
  };

  const clearAll = () => {
    applyParams((p) => {
      for (const key of [
        "q",
        "statuses",
        "importedOnly",
        "localOnly",
        "missionLinked",
        "allDayOnly",
        "timedOnly",
        "recurringOnly",
        "nonRecurringOnly",
        "conflictActive",
        "includeCancelled",
        "includeArchived",
        "countyIds",
        "calendarIds",
        "tags",
        "savedViewId",
        "availabilityClassifications",
        "integrityFinding",
      ]) {
        p.delete(key);
      }
    });
  };

  const saveCurrent = async () => {
    const name = saveName.trim();
    if (!name) {
      setSaveMsg("Name required to save a view.");
      return;
    }
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key === "event" || key === "returnTo") return;
      query[key] = value;
    });
    try {
      const res = await fetch("/api/calendar/saved-views", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          query,
          visibility: "PRIVATE",
          viewMode: searchParams.get("viewMode") ?? searchParams.get("view") ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setSaveMsg("Could not save view.");
        return;
      }
      setSaveMsg("Saved privately.");
      setSaveName("");
      setViews((prev) => [...prev, { id: data.view.id, name: data.view.name }]);
      applyParams((p) => p.set("savedViewId", data.view.id));
    } catch {
      setSaveMsg("Could not save view.");
    }
  };

  return (
    <section
      className={`calendar-search-chrome${compact ? " calendar-search-chrome-compact" : ""}`}
      aria-label="Calendar search and filters"
    >
      <div className="calendar-search-row">
        <label className="calendar-search-input">
          <span className="sr-only">Search calendar</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSearch();
              }
            }}
            placeholder="Search title, place, county…"
            aria-label="Search calendar"
          />
        </label>
        <button
          type="button"
          className="chip"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
        >
          Filters
        </button>
        <Link className="chip chip-link" href="/system/calendar/saved-views">
          Saved views
        </Link>
        <Link className="chip chip-link" href="/system/calendar/subscriptions">
          Subscriptions
        </Link>
        <Link className="chip chip-link" href="/system/calendar/exports">
          Export ICS
        </Link>
        {resultCount != null ? (
          <span className="muted" aria-live="polite">
            {resultCount} event{resultCount === 1 ? "" : "s"}
            {truncated ? " (partial)" : ""}
            {pending ? " · updating…" : ""}
          </span>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="calendar-filter-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="chip chip-removable"
              onClick={() => clearOne(chip.clearParam)}
            >
              {chip.label} ×
            </button>
          ))}
          <button type="button" className="chip" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="calendar-filter-drawer panel" role="region" aria-label="Filter options">
          {FILTER_DEFS.map((def) => (
            <label key={def.param} className="calendar-filter-field">
              <span>{def.label}</span>
              <select
                value={searchParams.get(def.param) ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  applyParams((p) => {
                    if (!value) p.delete(def.param);
                    else {
                      if (def.param === "importedOnly") {
                        p.delete("localOnly");
                        if (value === "0") {
                          p.delete("importedOnly");
                          p.set("localOnly", "1");
                          return;
                        }
                      }
                      if (def.param === "allDayOnly") {
                        p.delete("timedOnly");
                        if (value === "0") {
                          p.delete("allDayOnly");
                          p.set("timedOnly", "1");
                          return;
                        }
                      }
                      if (def.param === "recurringOnly") {
                        p.delete("nonRecurringOnly");
                        if (value === "0") {
                          p.delete("recurringOnly");
                          p.set("nonRecurringOnly", "1");
                          return;
                        }
                      }
                      p.set(def.param, value);
                    }
                  });
                }}
              >
                <option value="">Any</option>
                {(def.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <div className="calendar-save-view">
            <label>
              <span>Save current view</span>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Name"
                maxLength={120}
              />
            </label>
            <button type="button" className="chip" onClick={() => void saveCurrent()}>
              Save private
            </button>
            {saveMsg ? <p className="muted">{saveMsg}</p> : null}
          </div>

          {views.length > 0 ? (
            <label className="calendar-filter-field">
              <span>Open saved view</span>
              <select
                value={searchParams.get("savedViewId") ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  applyParams((p) => {
                    if (!id) p.delete("savedViewId");
                    else p.set("savedViewId", id);
                  });
                }}
              >
                <option value="">—</option>
                {views.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
