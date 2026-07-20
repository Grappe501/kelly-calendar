"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type {
  CampaignCommChannel,
  CampaignCommPurpose,
  CampaignCommSuppressionReason,
} from "@/lib/missions/v21/communications";
import {
  labelCommChannel,
  labelCommPurpose,
} from "@/lib/missions/v21/communications";
import {
  commJsonFetch,
  type SuppressionListView,
} from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";

type Props = { initial: SuppressionListView };

const REASONS: CampaignCommSuppressionReason[] = [
  "OPT_OUT",
  "DO_NOT_CONTACT",
  "INVALID_DESTINATION",
  "BOUNCE",
  "COMPLAINT",
  "WRONG_PERSON",
  "SHARED_CONTACT_RESTRICTED",
  "PRIVACY_HOLD",
  "MANUAL_POLICY",
  "UNKNOWN",
];

const CHANNELS: CampaignCommChannel[] = ["EMAIL", "SMS", "PHONE", "IN_APP", "MANUAL"];

export function SuppressionsView({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initial.items);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState<CampaignCommSuppressionReason>("OPT_OUT");
  const [channel, setChannel] = useState<CampaignCommChannel>("EMAIL");
  const [destination, setDestination] = useState("");
  const [allChannels, setAllChannels] = useState(false);
  const [revokeReason, setRevokeReason] = useState<Record<string, string>>({});

  function reload() {
    startTransition(async () => {
      setError(null);
      try {
        const json = await commJsonFetch<SuppressionListView>(
          "/api/communications/suppressions",
          "GET",
        );
        setItems(json.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reload failed.");
      }
    });
  }

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications</p>
        <h1>Suppressions</h1>
        <nav className="briefing-nav" aria-label="Communications navigation">
          <Link href="/system/communications">Communications queue</Link>
          <Link href="/system/communications/policy">Policy</Link>
        </nav>
      </header>

      <CommunicationsNotices notices={initial.notices} />

      {message ? (
        <p className="panel" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error panel" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="sup-create-h">
        <h2 id="sup-create-h">Record suppression</h2>
        <p className="muted">
          Destinations are stored masked — enter contact for lookup only.
        </p>
        <div className="form-stack">
          <label>
            Reason
            <select
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as CampaignCommSuppressionReason)
              }
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={allChannels}
              onChange={(e) => setAllChannels(e.target.checked)}
            />{" "}
            All channels
          </label>
          {!allChannels ? (
            <label>
              Channel
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as CampaignCommChannel)
                }
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {labelCommChannel(c)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Destination (for contact lookup)
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="button"
          disabled={pending || !destination.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              try {
                await commJsonFetch("/api/communications/suppressions", "POST", {
                  reason,
                  channel: allChannels ? null : channel,
                  allChannels,
                  destination: destination.trim(),
                });
                setDestination("");
                setMessage("Suppression recorded.");
                reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Create failed.");
              }
            })
          }
        >
          Record suppression
        </button>
      </section>

      <section className="panel" aria-labelledby="sup-list-h">
        <h2 id="sup-list-h">Active suppressions</h2>
        {items.length === 0 ? (
          <p className="muted">No active suppressions.</p>
        ) : (
          <ul className="briefing-list">
            {items.map((item) => (
              <li key={item.id}>
                <h3>{item.reason.replace(/_/g, " ")}</h3>
                <p className="muted">
                  {item.allChannels
                    ? "All channels"
                    : item.channel
                      ? labelCommChannel(item.channel)
                      : "Channel unspecified"}
                  {item.purpose ? ` · ${labelCommPurpose(item.purpose)}` : ""}
                  {" · "}
                  Effective {new Date(item.effectiveAt).toLocaleString()}
                </p>
                <label>
                  Revocation reason
                  <input
                    value={revokeReason[item.id] ?? ""}
                    onChange={(e) =>
                      setRevokeReason((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="button secondary"
                  disabled={pending || !(revokeReason[item.id] ?? "").trim()}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      setMessage(null);
                      try {
                        await commJsonFetch(
                          "/api/communications/suppressions",
                          "PATCH",
                          {
                            suppressionId: item.id,
                            reason: revokeReason[item.id]?.trim(),
                          },
                        );
                        setMessage("Suppression revoked.");
                        reload();
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Revoke failed.",
                        );
                      }
                    })
                  }
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
