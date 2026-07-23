"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HealthAcknowledgeButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function acknowledge() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/calendar/health/alerts/${alertId}/acknowledge`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        setMessage(json.error?.message ?? `Acknowledge failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="stack-sm">
      {message ? (
        <span className="muted" role="status">
          {message}
        </span>
      ) : null}
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => void acknowledge()}
      >
        Acknowledge
      </button>
    </span>
  );
}
