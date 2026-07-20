"use client";

import { useState, useTransition } from "react";
import {
  labelEligibilityState,
  labelInclusionState,
} from "@/lib/missions/v21/communications";
import {
  commJsonFetch,
  type CommunicationDetail,
} from "@/components/communications/shared";
import { CommunicationDetailShell } from "@/components/communications/CommunicationDetailShell";

type Props = { initial: CommunicationDetail };

const SOURCES = [
  "STAFFING_ASSIGNMENTS",
  "CAMPAIGN_USERS",
  "MANUAL",
  "CONSENT_CONTACTS",
] as const;

export function CommunicationAudienceReview({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "STAFFING_ASSIGNMENTS",
  ]);
  const [noteByMember, setNoteByMember] = useState<Record<string, string>>({});

  const base = `/api/communications/${detail.communication.id}/audience`;

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed.");
      }
    });
  }

  function toggleSource(source: string) {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    );
  }

  return (
    <CommunicationDetailShell detail={detail} active="audience">
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

      <section className="panel" aria-labelledby="audience-materialize-h">
        <h2 id="audience-materialize-h">Materialize audience</h2>
        <p className="muted">
          Select explicit candidate sources. Operational relevance never implies
          consent.
        </p>
        <ul className="briefing-fact-list">
          {SOURCES.map((source) => (
            <li key={source}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => toggleSource(source)}
                />{" "}
                {source.replace(/_/g, " ")}
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="button"
          disabled={pending || selectedSources.length === 0}
          onClick={() =>
            run(async () => {
              const json = await commJsonFetch<{ detail: CommunicationDetail }>(
                base,
                "POST",
                { sources: selectedSources },
              );
              setDetail(json.detail);
              setMessage("Audience materialized.");
            })
          }
        >
          Materialize audience
        </button>
      </section>

      <section className="panel" aria-labelledby="audience-review-h">
        <h2 id="audience-review-h">Review members (masked labels only)</h2>
        {detail.audience.length === 0 ? (
          <p className="muted">No audience members yet.</p>
        ) : (
          <ul className="briefing-list">
            {detail.audience.map((m) => (
              <li key={m.id}>
                <h3>{m.maskedLabel}</h3>
                <p className="muted">
                  Source: {m.candidateSource}
                  {" · "}
                  {labelEligibilityState(m.eligibilityState)}
                  {" · "}
                  {labelInclusionState(m.inclusionState)}
                </p>
                {m.eligibilityReasonCodes.length > 0 ? (
                  <p className="muted">
                    Blocking: {m.eligibilityReasonCodes.join(", ")}
                  </p>
                ) : null}
                <label>
                  Note (optional)
                  <input
                    value={noteByMember[m.id] ?? ""}
                    onChange={(e) =>
                      setNoteByMember((prev) => ({
                        ...prev,
                        [m.id]: e.target.value,
                      }))
                    }
                  />
                </label>
                <div className="closeout-button-row">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const json = await commJsonFetch<{
                          detail: CommunicationDetail;
                        }>(base, "PATCH", {
                          action: "include",
                          memberId: m.id,
                          inclusionState: "INCLUDED",
                          note: noteByMember[m.id] || undefined,
                        });
                        setDetail(json.detail);
                        setMessage("Member included.");
                      })
                    }
                  >
                    Include
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const json = await commJsonFetch<{
                          detail: CommunicationDetail;
                        }>(base, "PATCH", {
                          action: "include",
                          memberId: m.id,
                          inclusionState: "EXCLUDED",
                          note: noteByMember[m.id] || undefined,
                        });
                        setDetail(json.detail);
                        setMessage("Member excluded.");
                      })
                    }
                  >
                    Exclude
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const json = await commJsonFetch<{
                          detail: CommunicationDetail;
                        }>(base, "PATCH", {
                          action: "include",
                          memberId: m.id,
                          inclusionState: "EXCEPTION_INCLUDED",
                          note: noteByMember[m.id] || undefined,
                        });
                        setDetail(json.detail);
                        setMessage("Exception inclusion recorded.");
                      })
                    }
                  >
                    Exception include
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="button"
          disabled={pending || detail.audience.length === 0}
          onClick={() =>
            run(async () => {
              const json = await commJsonFetch<{ detail: CommunicationDetail }>(
                base,
                "PATCH",
                { action: "approve" },
              );
              setDetail(json.detail);
              setMessage("Audience approved.");
            })
          }
        >
          Approve audience
        </button>
      </section>
    </CommunicationDetailShell>
  );
}
