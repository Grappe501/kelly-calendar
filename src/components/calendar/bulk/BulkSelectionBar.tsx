"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOptionalBulkSelection } from "@/components/calendar/bulk/BulkSelectionProvider";

const ACTIONS = [
  { id: "ARCHIVE", label: "Archive" },
  { id: "RESTORE", label: "Restore" },
  { id: "CANCEL", label: "Cancel" },
  { id: "ADD_CALENDAR", label: "Add to calendar" },
  { id: "REMOVE_CALENDAR", label: "Remove from calendar" },
] as const;

/**
 * Sticky bulk action bar — selection alone never mutates.
 * Preview posts to /api/calendar/bulk then navigates to operation page.
 */
export function BulkSelectionBar() {
  const selection = useOptionalBulkSelection();
  const router = useRouter();
  const [action, setAction] = useState<(typeof ACTIONS)[number]["id"]>("ARCHIVE");
  const [reason, setReason] = useState("");
  const [targetCalendarId, setTargetCalendarId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selection || selection.selectedCount === 0) return null;

  async function preview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionType: action,
          eventIds: [...selection!.selectedIds],
          reason: reason || undefined,
          targetCalendarId: targetCalendarId || undefined,
          clientNonce: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.publicMessage ?? "Preview failed.");
        return;
      }
      router.push(`/system/calendar/bulk/${json.operation.id}`);
    } catch {
      setError("Preview request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bulk-selection-bar panel" role="region" aria-label="Bulk selection">
      <p>
        <strong>{selection.selectedCount}</strong> selected
        <button type="button" className="chip" onClick={selection.clear} style={{ marginLeft: 8 }}>
          Clear
        </button>
      </p>
      <div className="bulk-selection-controls">
        <label>
          Action
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as typeof action)}
            aria-label="Bulk action"
          >
            {ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {(action === "ARCHIVE" || action === "CANCEL") && (
          <label>
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
              aria-label="Bulk reason"
            />
          </label>
        )}
        {(action === "ADD_CALENDAR" || action === "REMOVE_CALENDAR") && (
          <label>
            Calendar ID
            <input
              value={targetCalendarId}
              onChange={(e) => setTargetCalendarId(e.target.value)}
              aria-label="Target calendar id"
            />
          </label>
        )}
        <button type="button" className="button" disabled={busy} onClick={preview}>
          {busy ? "Previewing…" : "Preview (no changes yet)"}
        </button>
        <Link className="chip chip-link" href="/system/calendar/bulk">
          Bulk history
        </Link>
      </div>
      {error ? <p className="muted">{error}</p> : null}
      <p className="muted">
        Selection and preview never mutate Events. Confirmation happens on the preview page.
      </p>
    </div>
  );
}
