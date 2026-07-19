"use client";

import { useMemo, useState } from "react";

type SourceType = "PUBLIC_ICAL" | "PRIVATE_ICAL_ENV" | "GOOGLE_API";

function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function GoogleImportPanel() {
  const [sourceType, setSourceType] = useState<SourceType>("PRIVATE_ICAL_ENV");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Kelly private Google Calendar (env)");
  const [startsAt, setStartsAt] = useState("2025-11-01");
  const [endsAt, setEndsAt] = useState(chicagoToday());
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [includeAllDay, setIncludeAllDay] = useState(true);
  const [expandRecurring, setExpandRecurring] = useState(true);
  const [importDescriptions, setImportDescriptions] = useState(true);
  const [importLocations, setImportLocations] = useState(true);
  const [importLinks, setImportLinks] = useState(true);
  const [mode, setMode] = useState<"preview" | "stage" | "stage_review">("preview");
  const [configured, setConfigured] = useState<{
    identifier: string;
    fingerprint: string;
  } | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rangePayload = useMemo(() => {
    const base = {
      sourceType,
      sourceLabel,
      startsAt: `${startsAt}T00:00:00-05:00`,
      endsAt: `${endsAt}T23:59:59-05:00`,
      includeCancelled,
      includeAllDay,
      expandRecurring,
      importDescriptions,
      importLocations,
      importLinks,
    };
    if (sourceType === "PRIVATE_ICAL_ENV") {
      // Never send the secret URL from the browser — server reads env.
      return base;
    }
    return { ...base, sourceUrl };
  }, [
    sourceType,
    sourceUrl,
    sourceLabel,
    startsAt,
    endsAt,
    includeCancelled,
    includeAllDay,
    expandRecurring,
    importDescriptions,
    importLocations,
    importLinks,
  ]);

  function selectSourceType(next: SourceType) {
    setSourceType(next);
    setConfigured(null);
    setResult(null);
    setError(null);
    if (next === "PRIVATE_ICAL_ENV") {
      setSourceLabel("Kelly private Google Calendar (env)");
      setSourceUrl("");
    } else if (next === "PUBLIC_ICAL") {
      setSourceLabel("Kelly public Google Calendar");
    }
  }

  async function validateSource() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/google-calendar/validate-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sourceType === "PRIVATE_ICAL_ENV" || sourceType === "GOOGLE_API"
            ? { sourceType }
            : { sourceUrl, sourceType },
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Validation failed");
        setConfigured(null);
        return;
      }
      if (sourceType === "GOOGLE_API") {
        setConfigured({
          identifier: "Google Calendar API (OAuth pending)",
          fingerprint: "api-pending",
        });
        setSourceUrl("");
        return;
      }
      if (sourceType === "PRIVATE_ICAL_ENV" && json.calendarFeedConfigured === false) {
        setError(json.message ?? "Private iCal feed is not configured on the server.");
        setConfigured(null);
        return;
      }
      setConfigured({
        identifier: String(json.identifier ?? "configured"),
        fingerprint: String(json.sourceFingerprint ?? ""),
      });
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (sourceType === "GOOGLE_API") {
      setError("Google Calendar API OAuth is not active. Use private env iCal or public iCal.");
      return;
    }
    if (sourceType === "PUBLIC_ICAL") {
      if (!sourceUrl.trim() && !configured) {
        setError("Enter and validate a public iCal source first.");
        return;
      }
      if (!sourceUrl.trim()) {
        setError("Re-enter the public iCal URL to run import (it is not stored after validation).");
        return;
      }
    }
    if (sourceType === "PRIVATE_ICAL_ENV" && !configured) {
      setError("Validate the private env feed first (server reads KCCC_GOOGLE_CALENDAR_ICAL_URL).");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const endpoint =
        mode === "preview"
          ? "/api/import/google-calendar/preview"
          : "/api/import/google-calendar/stage";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rangePayload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Import failed");
        return;
      }
      setResult(json);
      if (sourceType === "PUBLIC_ICAL") setSourceUrl("");
      if (json.redactedSource) {
        setConfigured({
          identifier: String(json.redactedSource),
          fingerprint: String(json.sourceFingerprint ?? ""),
        });
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="dev-banner" role="note">
        Historical import floor: <strong>November 1, 2025</strong>. Database writes are disabled.
        Events are staged on H-drive for operator review only. Secret iCal addresses are
        read-only and must never be pasted into this form.
      </section>

      <section className="panel">
        <h2>1. Source</h2>
        <fieldset>
          <legend>Source type</legend>
          <label className="check-inline">
            <input
              type="radio"
              checked={sourceType === "PRIVATE_ICAL_ENV"}
              onChange={() => selectSourceType("PRIVATE_ICAL_ENV")}
            />{" "}
            Private Google Calendar iCal (server env)
          </label>
          <label className="check-inline">
            <input
              type="radio"
              checked={sourceType === "PUBLIC_ICAL"}
              onChange={() => selectSourceType("PUBLIC_ICAL")}
            />{" "}
            Public Google Calendar iCal link
          </label>
          <label className="check-inline">
            <input
              type="radio"
              checked={sourceType === "GOOGLE_API"}
              onChange={() => selectSourceType("GOOGLE_API")}
            />{" "}
            Google Calendar API connection
          </label>
        </fieldset>
        <label>
          Calendar source label
          <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
        </label>
        {sourceType === "PRIVATE_ICAL_ENV" ? (
          <p className="muted">
            Uses server environment variable <code>KCCC_GOOGLE_CALENDAR_ICAL_URL</code> only.
            Do not paste the secret address here. Sync direction: <strong>import only</strong> —
            push back to Google is not available over iCal.
          </p>
        ) : null}
        {sourceType === "PUBLIC_ICAL" ? (
          configured ? (
            <p className="muted">
              Source URL accepted and held for this session only. Full link is not shown after
              validation. Clear the page to discard.
            </p>
          ) : (
            <label>
              Public calendar URL
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/…"
                autoComplete="off"
              />
            </label>
          )
        ) : null}
        {sourceType === "GOOGLE_API" ? (
          <p className="muted">
            API mode requires OAuth. Contract only for now. This is the path for future
            two-way sync / push.
          </p>
        ) : null}
        <div className="button-row">
          <button type="button" className="button secondary" disabled={busy} onClick={validateSource}>
            Validate source
          </button>
        </div>
        {configured ? (
          <div className="dev-banner" style={{ marginTop: "1rem" }}>
            <strong>Source configured</strong>
            <p style={{ margin: "0.35rem 0 0" }}>
              {sourceType === "PRIVATE_ICAL_ENV"
                ? "Google Calendar private iCal (env)"
                : sourceType === "PUBLIC_ICAL"
                  ? "Google Calendar public iCal source"
                  : "Google Calendar API"}
              <br />
              Identifier: {configured.identifier}
              <br />
              Fingerprint: {configured.fingerprint}
              <br />
              Push supported: no
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>2. Date range</h2>
        <div className="form-grid">
          <label>
            From
            <input
              type="date"
              min="2025-11-01"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value < "2025-11-01" ? "2025-11-01" : e.target.value)}
            />
          </label>
          <label>
            Through
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
        </div>
        <div className="checkbox-grid">
          <label className="check-inline">
            <input type="checkbox" checked disabled /> Include events ending after start date
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => setIncludeCancelled(e.target.checked)}
            />{" "}
            Include cancelled events
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={includeAllDay}
              onChange={(e) => setIncludeAllDay(e.target.checked)}
            />{" "}
            Include all-day events
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={expandRecurring}
              onChange={(e) => setExpandRecurring(e.target.checked)}
            />{" "}
            Expand recurring events
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={importDescriptions}
              onChange={(e) => setImportDescriptions(e.target.checked)}
            />{" "}
            Import event descriptions
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={importLocations}
              onChange={(e) => setImportLocations(e.target.checked)}
            />{" "}
            Import public locations
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={importLinks}
              onChange={(e) => setImportLinks(e.target.checked)}
            />{" "}
            Import public links
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>3. Import mode</h2>
        <fieldset>
          {(
            [
              ["preview", "Preview only"],
              ["stage", "Fetch and stage"],
              ["stage_review", "Fetch, stage, and open review queue"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="check-inline">
              <input
                type="radio"
                checked={mode === value}
                onChange={() => setMode(value)}
              />{" "}
              {label}
            </label>
          ))}
        </fieldset>
        <p className="muted">There is no “import directly into production database” option.</p>
      </section>

      <section className="panel">
        <h2>4. Safety summary</h2>
        <ul className="status-list">
          <li>
            <span>Source validated</span>
            <strong>{configured ? "yes" : "pending"}</strong>
          </li>
          <li>
            <span>Date floor</span>
            <strong>November 1, 2025</strong>
          </li>
          <li>
            <span>Database writes</span>
            <strong>disabled</strong>
          </li>
          <li>
            <span>Push to Google</span>
            <strong>not supported (iCal is read-only)</strong>
          </li>
          <li>
            <span>Staging destination</span>
            <strong>H-drive</strong>
          </li>
          <li>
            <span>Duplicate detection</span>
            <strong>enabled</strong>
          </li>
          <li>
            <span>Operator review required</span>
            <strong>yes</strong>
          </li>
        </ul>
        <div className="button-row">
          <button type="button" className="button" disabled={busy} onClick={runImport}>
            {busy ? "Working…" : mode === "preview" ? "Run preview" : "Fetch and stage"}
          </button>
        </div>
        {error ? (
          <p className="dev-banner" role="alert" style={{ marginTop: "1rem" }}>
            {error}
          </p>
        ) : null}
        {result ? (
          <div style={{ marginTop: "1rem" }}>
            <h3>Result</h3>
            <ul className="status-list">
              <li>
                <span>Normalized</span>
                <strong>{String(result.totalNormalized ?? 0)}</strong>
              </li>
              <li>
                <span>Review queue</span>
                <strong>{String(result.reviewQueueCount ?? 0)}</strong>
              </li>
              <li>
                <span>DB writes</span>
                <strong>no</strong>
              </li>
              <li>
                <span>Push supported</span>
                <strong>no</strong>
              </li>
              {"importId" in result && result.importId ? (
                <li>
                  <span>Import ID</span>
                  <strong>{String(result.importId)}</strong>
                </li>
              ) : null}
            </ul>
            {mode === "stage_review" && result.importId ? (
              <a className="button secondary" href="/import/google-calendar/review">
                Open review queue
              </a>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
