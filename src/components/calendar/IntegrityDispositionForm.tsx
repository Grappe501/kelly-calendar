"use client";

import { useState } from "react";

type Props = {
  findingId: string;
  currentState: string;
};

export function IntegrityDispositionForm({ findingId, currentState }: Props) {
  const [disposition, setDisposition] = useState("ACKNOWLEDGED");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/calendar/integrity/findings/${findingId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ disposition, reason }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        setMessage(json.error?.message ?? `Failed (${res.status})`);
        return;
      }
      setMessage(`Recorded ${disposition}. Finding remains non-destructive.`);
      window.location.reload();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-sm">
      <p className="muted">Current state: {currentState}</p>
      {message ? (
        <p className="dev-banner" role="status">
          {message}
        </p>
      ) : null}
      <label>
        Disposition
        <select
          className="input"
          value={disposition}
          onChange={(e) => setDisposition(e.target.value)}
        >
          <option value="ACKNOWLEDGED">ACKNOWLEDGED (stays active)</option>
          <option value="ACCEPTED_RISK">ACCEPTED_RISK (reason required)</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="NOT_APPLICABLE">NOT_APPLICABLE (reason required)</option>
        </select>
      </label>
      <label>
        Reason
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button type="button" className="button" disabled={busy} onClick={() => void submit()}>
        Record disposition
      </button>
    </div>
  );
}
