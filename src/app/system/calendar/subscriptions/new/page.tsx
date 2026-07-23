"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Privacy = "BUSY_ONLY" | "CITY_ONLY" | "OPERATIONAL_REDACTED";
type Scope = "RELATIVE_WINDOW" | "DATE_RANGE" | "SAVED_VIEW";

export default function NewSubscriptionPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacyProfile, setPrivacyProfile] = useState<Privacy>("CITY_ONLY");
  const [scopeType, setScopeType] = useState<Scope>("RELATIVE_WINDOW");
  const [forwardDays, setForwardDays] = useState(90);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [savedViewId, setSavedViewId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [feedId, setFeedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const absoluteUrl = useMemo(() => {
    if (!subscriptionUrl || typeof window === "undefined") return subscriptionUrl;
    if (subscriptionUrl.startsWith("http")) return subscriptionUrl;
    return `${window.location.origin}${subscriptionUrl}`;
  }, [subscriptionUrl]);

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        privacyProfile,
        scopeType,
      };
      if (scopeType === "RELATIVE_WINDOW") {
        body.dateWindowPolicy = {
          relativeDateMode: "NEXT_N_DAYS",
          forwardDays,
        };
        body.query = {
          relativeDateMode: "NEXT_N_DAYS",
          forwardDays,
        };
      } else if (scopeType === "DATE_RANGE") {
        body.query = { dateFrom, dateTo };
      } else {
        body.savedViewId = savedViewId.trim();
      }

      const res = await fetch("/api/calendar/subscriptions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Could not create subscription.");
        return;
      }
      setSubscriptionUrl(json.subscriptionUrl as string);
      setFeedId(json.feed?.id ?? null);
    } catch {
      setError("Could not create subscription.");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="page-stack">
      <meta name="referrer" content="no-referrer" />
      <header className="page-header">
        <h1>New subscription feed</h1>
        <p className="muted">
          Creates a private, read-only ICS URL. FULL privacy is not available for
          feeds — choose a redacted profile.
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/subscriptions">
            All subscriptions
          </Link>
        </p>
      </header>

      {subscriptionUrl ? (
        <section className="panel">
          <h2>Subscription URL (shown once)</h2>
          <p className="muted">
            Anyone with this private subscription URL may read the feed until it
            is revoked. Treat it like a password.
          </p>
          <p>
            <code style={{ wordBreak: "break-all" }}>{absoluteUrl}</code>
          </p>
          <p>
            <button type="button" className="chip" onClick={() => void copyUrl()}>
              {copied ? "Copied" : "Copy URL"}
            </button>{" "}
            {feedId ? (
              <Link className="chip chip-link" href={`/system/calendar/subscriptions/${feedId}`}>
                Open feed detail
              </Link>
            ) : null}
          </p>
        </section>
      ) : (
        <section className="panel">
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </label>
          <label>
            Privacy profile
            <select
              value={privacyProfile}
              onChange={(e) => setPrivacyProfile(e.target.value as Privacy)}
            >
              <option value="BUSY_ONLY">Busy only</option>
              <option value="CITY_ONLY">City only</option>
              <option value="OPERATIONAL_REDACTED">Operational (redacted)</option>
            </select>
          </label>
          <label>
            Scope
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as Scope)}
            >
              <option value="RELATIVE_WINDOW">Rolling forward window</option>
              <option value="DATE_RANGE">Fixed date range</option>
              <option value="SAVED_VIEW">Saved view</option>
            </select>
          </label>

          {scopeType === "RELATIVE_WINDOW" ? (
            <label>
              Forward days
              <input
                type="number"
                min={1}
                max={365}
                value={forwardDays}
                onChange={(e) => setForwardDays(Number(e.target.value) || 90)}
              />
            </label>
          ) : null}

          {scopeType === "DATE_RANGE" ? (
            <>
              <label>
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </>
          ) : null}

          {scopeType === "SAVED_VIEW" ? (
            <label>
              Saved view ID
              <input
                value={savedViewId}
                onChange={(e) => setSavedViewId(e.target.value)}
                placeholder="cuid…"
              />
            </label>
          ) : null}

          <p>
            <button
              type="button"
              className="button"
              disabled={busy || !name.trim()}
              onClick={() => void create()}
            >
              {busy ? "Creating…" : "Create subscription"}
            </button>
          </p>
          {error ? <p className="muted">{error}</p> : null}
        </section>
      )}
    </div>
  );
}
