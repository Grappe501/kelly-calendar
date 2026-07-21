"use client";

import { useState, useTransition } from "react";
import {
  commJsonFetch,
  type DispatchControlsView,
} from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import {
  DispatchAdminNav,
  KillSwitchSummary,
} from "@/components/communications/dispatch/shared";

type Props = { initial: DispatchControlsView };

export function ControlsPanel({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState(initial);
  const [reason, setReason] = useState("");
  const [globalKillSwitch, setGlobalKillSwitch] = useState(
    initial.globalKillSwitch,
  );
  const [emailKillSwitch, setEmailKillSwitch] = useState(
    initial.emailKillSwitch,
  );
  const [smsKillSwitch, setSmsKillSwitch] = useState(initial.smsKillSwitch);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D21</p>
        <h1>Dispatch kill switches</h1>
        <p className="muted">
          Kill switches default ON (blocking). Re-enabling does not resume old
          batches.
        </p>
        <DispatchAdminNav />
      </header>

      <CommunicationsNotices notices={view.notices} />

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

      <section className="panel" aria-labelledby="controls-current-h">
        <h2 id="controls-current-h">Current controls</h2>
        <KillSwitchSummary
          globalKillSwitch={view.globalKillSwitch}
          emailKillSwitch={view.emailKillSwitch}
          smsKillSwitch={view.smsKillSwitch}
        />
        <dl className="briefing-dl">
          <dt>Version</dt>
          <dd>{view.version}</dd>
          <dt>Last changed</dt>
          <dd>{new Date(view.changedAt).toLocaleString()}</dd>
          {view.reason ? (
            <>
              <dt>Last reason</dt>
              <dd>{view.reason}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="panel" aria-labelledby="controls-update-h">
        <h2 id="controls-update-h">Update kill switches</h2>
        <p className="muted">
          Turning a switch OFF permits dispatch when other gates allow it.
          Turning ON blocks immediately for new batches.
        </p>
        <label>
          <input
            type="checkbox"
            checked={globalKillSwitch}
            onChange={(e) => setGlobalKillSwitch(e.target.checked)}
          />{" "}
          Global kill switch ON (blocking)
        </label>
        <label>
          <input
            type="checkbox"
            checked={emailKillSwitch}
            onChange={(e) => setEmailKillSwitch(e.target.checked)}
          />{" "}
          Email kill switch ON (blocking)
        </label>
        <label>
          <input
            type="checkbox"
            checked={smsKillSwitch}
            onChange={(e) => setSmsKillSwitch(e.target.checked)}
          />{" "}
          SMS kill switch ON (blocking)
        </label>
        <label>
          Reason for change (required)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Pausing outbound while reviewing policy"
          />
        </label>
        <button
          type="button"
          className="button"
          disabled={pending || !reason.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              try {
                const refreshed = await commJsonFetch<DispatchControlsView>(
                  "/api/communications/controls",
                  "PATCH",
                  {
                    reason: reason.trim(),
                    globalKillSwitch,
                    emailKillSwitch,
                    smsKillSwitch,
                  },
                );
                setView(refreshed);
                setGlobalKillSwitch(refreshed.globalKillSwitch);
                setEmailKillSwitch(refreshed.emailKillSwitch);
                setSmsKillSwitch(refreshed.smsKillSwitch);
                setMessage("Kill switches updated.");
                setReason("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Update failed.",
                );
              }
            })
          }
        >
          Save controls
        </button>
      </section>
    </article>
  );
}
