"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FIELD_CHECKIN_LABELS,
  fieldCheckInToDayAction,
  type FieldCheckIn,
} from "@/lib/missions/field-operations";

type Props = {
  missionId: string;
  eventVersion: number;
  canCheckIn: boolean;
};

const CHECKINS: FieldCheckIn[] = [
  "ON_SITE",
  "RUNNING_LATE",
  "NEED_HELP",
  "MISSION_COMPLETE",
];

export function FieldCheckIns({ missionId, eventVersion, canCheckIn }: Props) {
  const router = useRouter();
  const [version, setVersion] = useState(eventVersion);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<FieldCheckIn | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canCheckIn) return null;

  async function run(checkIn: FieldCheckIn) {
    setError(null);
    setSuccess(null);
    setPending(checkIn);
    const action = fieldCheckInToDayAction(checkIn);
    try {
      const res = await fetch(`/api/events/${missionId}/mission-day`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, expectedVersion: version }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError("Mission changed elsewhere. Refresh and retry.");
        startTransition(() => router.refresh());
        return;
      }
      if (!res.ok) {
        setError(body?.error?.message || "Check-in failed. Try again.");
        return;
      }
      if (typeof body?.missionDay?.version === "number") {
        setVersion(body.missionDay.version);
      }
      setSuccess(`${FIELD_CHECKIN_LABELS[checkIn]} — saved.`);
      startTransition(() => router.refresh());
    } catch {
      setError("Network error. Check connection and retry.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="field-checkins">
      <p className="muted">Check-in</p>
      <div className="button-row field-checkin-row">
        {CHECKINS.map((c) => (
          <button
            key={c}
            type="button"
            className={c === "NEED_HELP" || c === "RUNNING_LATE" ? "button secondary" : "button"}
            disabled={isPending || pending !== null}
            onClick={() => void run(c)}
          >
            {pending === c ? "Saving…" : FIELD_CHECKIN_LABELS[c]}
          </button>
        ))}
      </div>
      {success ? (
        <p className="mission-day-feedback ok" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mission-day-feedback err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
