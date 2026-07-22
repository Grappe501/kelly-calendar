"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventIntegrityScanButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/integrity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: "EVENT", eventId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        scanId?: string;
        findingsTotal?: number;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        setMessage(json.error?.message ?? `Failed (${res.status})`);
        return;
      }
      setMessage(`Scan recorded ${json.findingsTotal ?? 0} finding(s).`);
      if (json.scanId) router.push(`/system/calendar/integrity/scans/${json.scanId}`);
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-sm">
      {message ? (
        <p className="dev-banner" role="status">
          {message}
        </p>
      ) : null}
      <button type="button" className="button" disabled={busy} onClick={() => void run()}>
        Run event integrity scan
      </button>
      <p className="muted">Creates scan/finding metadata only — no Event or Mission writes.</p>
    </div>
  );
}
