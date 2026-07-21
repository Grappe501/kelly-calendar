"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { labelCommChannel } from "@/lib/missions/v21/communications";
import {
  commJsonFetch,
  type DispatchPreflightView,
} from "@/components/communications/shared";
import {
  KillSwitchSummary,
  DISPATCH_OPERATOR_NOTICES,
} from "@/components/communications/dispatch/shared";

type Props = {
  communicationId: string;
  compact?: boolean;
};

export function DispatchPreflightPanel({
  communicationId,
  compact = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [preflight, setPreflight] = useState<DispatchPreflightView | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runPreflight() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await commJsonFetch<DispatchPreflightView>(
          "/api/communications/dispatch/preflight",
          "POST",
          { communicationId },
        );
        setPreflight(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preflight failed.");
      }
    });
  }

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await commJsonFetch<DispatchPreflightView>(
          "/api/communications/dispatch/preflight",
          "POST",
          { communicationId },
        );
        setPreflight(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preflight failed.");
      }
    });
  }, [communicationId]);

  function createBlockedBatch() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await commJsonFetch<{
          batchId: string;
          status: string;
          reason: string;
        }>("/api/communications/dispatch/batches", "POST", {
          communicationId,
        });
        setMessage(
          `Batch ${result.batchId} recorded as ${result.status}. ${result.reason}`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Batch creation failed.");
      }
    });
  }

  const Heading = compact ? "h3" : "h2";

  return (
    <section
      className="panel"
      aria-labelledby={compact ? "preflight-compact-h" : "preflight-h"}
    >
      <Heading id={compact ? "preflight-compact-h" : "preflight-h"}>
        Dispatch preflight
      </Heading>
      <p className="muted">
        Preflight checks gates only — it does not send messages. Provider
        acceptance is not delivery.
      </p>

      {DISPATCH_OPERATOR_NOTICES.map((notice) => (
        <p key={notice} className="muted">
          {notice}
        </p>
      ))}

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

      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={runPreflight}
        >
          Refresh preflight
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={pending || !preflight}
          onClick={createBlockedBatch}
        >
          Record blocked batch (not delivery)
        </button>
        {!compact ? (
          <Link className="button secondary" href="/system/communications/dispatch">
            Dispatch history
          </Link>
        ) : null}
      </div>

      {preflight ? (
        <>
          {preflight.providerKey === "disabled" ? (
            <p className="form-error" role="alert">
              No provider selected
            </p>
          ) : null}
          <p className="muted">
            <strong>{preflight.exactDisabledReason}</strong>
          </p>
          <dl className="briefing-dl">
            <dt>Communication</dt>
            <dd>{preflight.title}</dd>
            <dt>Channel</dt>
            <dd>{labelCommChannel(preflight.channel)}</dd>
            <dt>Provider</dt>
            <dd>{preflight.providerKey}</dd>
            <dt>Prepared queue items</dt>
            <dd>{preflight.preparedCount}</dd>
            <dt>Eligible</dt>
            <dd>{preflight.eligibleCount}</dd>
            <dt>Blocked</dt>
            <dd>{preflight.blockedCount}</dd>
            <dt>Dispatch available</dt>
            <dd>{preflight.dispatchAvailable ? "Yes" : "No"}</dd>
          </dl>
          <h3>Approvals</h3>
          <ul className="briefing-fact-list">
            <li>Content: {preflight.approvals.content ? "Yes" : "No"}</li>
            <li>Audience: {preflight.approvals.audience ? "Yes" : "No"}</li>
            <li>Dispatch: {preflight.approvals.dispatch ? "Yes" : "No"}</li>
          </ul>
          <h3>Kill switches</h3>
          <KillSwitchSummary
            globalKillSwitch={preflight.killSwitches.global}
            emailKillSwitch={preflight.killSwitches.email}
            smsKillSwitch={preflight.killSwitches.sms}
          />
          {preflight.sampleBlockingReasons.length > 0 ? (
            <>
              <h3>Sample blocking reasons</h3>
              <ul className="briefing-fact-list">
                {preflight.sampleBlockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : pending ? (
        <p className="muted">Running preflight…</p>
      ) : null}
    </section>
  );
}
