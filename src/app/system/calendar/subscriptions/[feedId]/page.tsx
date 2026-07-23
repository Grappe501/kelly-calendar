"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type FeedPayload = {
  feed: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    scopeType: string;
    privacyProfile: string;
    maxVisibilityGrant: string;
    tokenPrefix: string;
    tokenVersion: number;
    includeCancelledHistory: boolean;
    includedStatuses: string[];
    expiresAt: string | null;
    lastRotatedAt: string | null;
    lastAccessedAt: string | null;
    revokedAt: string | null;
    revocationReason: string | null;
    createdAt: string;
  };
  accessAudits: Array<{
    id: string;
    accessedAt: string;
    resultCategory: string;
    conditionalNotModified: boolean;
    clientCategory: string | null;
    rateLimited: boolean;
    eventCount: number | null;
  }>;
};

export default function SubscriptionDetailPage() {
  const params = useParams<{ feedId: string }>();
  const feedId = params.feedId;
  const [data, setData] = useState<FeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const absoluteNewUrl = useMemo(() => {
    if (!newUrl || typeof window === "undefined") return newUrl;
    if (newUrl.startsWith("http")) return newUrl;
    return `${window.location.origin}${newUrl}`;
  }, [newUrl]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/calendar/subscriptions/${feedId}`, {
      credentials: "same-origin",
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      setData(json);
      setError(null);
    } else {
      setError(json?.error?.message ?? "Failed to load feed.");
    }
  }, [feedId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rotate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/subscriptions/${feedId}/rotate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Rotate failed.");
        return;
      }
      setNewUrl(json.subscriptionUrl as string);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/subscriptions/${feedId}/revoke`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: revokeReason || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Revoke failed.");
        return;
      }
      setNewUrl(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="page-stack">
        <p className="muted">{error ?? "Loading…"}</p>
      </div>
    );
  }

  const feed = data.feed;
  const isActive = feed.status === "ACTIVE";

  return (
    <div className="page-stack">
      <meta name="referrer" content="no-referrer" />
      <header className="page-header">
        <h1>{feed.name}</h1>
        <p className="muted">
          {feed.status} · {feed.privacyProfile} · {feed.scopeType} · token{" "}
          {feed.tokenPrefix}… · v{feed.tokenVersion}
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/subscriptions">
            All subscriptions
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/exports">
            One-time export
          </Link>
        </p>
      </header>

      {feed.description ? (
        <section className="panel">
          <p>{feed.description}</p>
        </section>
      ) : null}

      {newUrl ? (
        <section className="panel">
          <h2>New subscription URL (shown once)</h2>
          <p className="muted">
            Anyone with this private subscription URL may read the feed until it
            is revoked. Treat it like a password. The previous URL is invalid.
          </p>
          <p>
            <code style={{ wordBreak: "break-all" }}>{absoluteNewUrl}</code>
          </p>
        </section>
      ) : null}

      <section className="panel">
        <h2>Manage</h2>
        <p className="muted">
          Max visibility grant fixed at creation: {feed.maxVisibilityGrant}.
          {feed.lastAccessedAt
            ? ` Last accessed ${feed.lastAccessedAt}.`
            : " Never accessed."}
          {feed.revokedAt ? ` Revoked ${feed.revokedAt}.` : ""}
        </p>
        <p>
          <button
            type="button"
            className="chip"
            disabled={busy || feed.status === "REVOKED"}
            onClick={() => void rotate()}
          >
            Rotate token
          </button>
        </p>
        <label>
          Revoke reason
          <input
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            maxLength={500}
            disabled={!isActive && feed.status !== "DISABLED"}
          />
        </label>
        <p>
          <button
            type="button"
            className="button"
            disabled={busy || feed.status === "REVOKED"}
            onClick={() => void revoke()}
          >
            Revoke feed
          </button>
        </p>
        {error ? <p className="muted">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Client setup</h2>
        <p className="muted">
          This is a <strong>subscribe</strong> URL (one-way pull). It is not
          two-way sync, and it is not the same as importing a downloaded{" "}
          <code>.ics</code> file once.
        </p>
        <ul>
          <li>
            <strong>Apple Calendar:</strong> File → New Calendar Subscription →
            paste the private URL. Refresh interval is controlled by Apple.
          </li>
          <li>
            <strong>Google Calendar:</strong> Other calendars → From URL → paste
            the HTTPS subscribe URL. Google caches; rotation requires updating
            the URL.
          </li>
          <li>
            <strong>Outlook:</strong> Add calendar → Subscribe from web → paste
            the URL. Outlook may poll infrequently.
          </li>
          <li>
            <strong>Generic:</strong> Any RFC 5545 client that can subscribe to
            an HTTPS calendar URL. Prefer subscribe over one-time import so
            revokes and rotations take effect.
          </li>
        </ul>
      </section>

      <section className="panel">
        <h2>Recent access</h2>
        {data.accessAudits.length === 0 ? (
          <p className="muted">No access audits yet.</p>
        ) : (
          <ul className="agenda-list">
            {data.accessAudits.map((a) => (
              <li key={a.id}>
                <span>
                  {a.accessedAt.slice(0, 19).replace("T", " ")} · {a.resultCategory}
                  {a.clientCategory ? ` · ${a.clientCategory}` : ""}
                  {a.eventCount != null ? ` · ${a.eventCount} events` : ""}
                  {a.conditionalNotModified ? " · 304" : ""}
                  {a.rateLimited ? " · rate limited" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
