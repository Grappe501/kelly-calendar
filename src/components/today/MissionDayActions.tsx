"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  MISSION_DAY_ACTION_LABELS,
  type MissionDayAction,
} from "@/lib/missions/mission-day-actions";

type Props = {
  missionId: string;
  eventVersion: number;
  actions: MissionDayAction[];
  canMutate: boolean;
};

export function MissionDayActions({
  missionId,
  eventVersion,
  actions,
  canMutate,
}: Props) {
  const router = useRouter();
  const [version, setVersion] = useState(eventVersion);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<MissionDayAction | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canMutate || actions.length === 0) return null;

  async function run(action: MissionDayAction) {
    setError(null);
    setSuccess(null);
    setPendingAction(action);
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
        setError(
          body?.error?.message ||
            body?.error?.publicMessage ||
            "Action failed. Try again.",
        );
        return;
      }
      const nextVersion = body?.missionDay?.version;
      if (typeof nextVersion === "number") setVersion(nextVersion);
      const label = MISSION_DAY_ACTION_LABELS[action];
      setSuccess(
        body?.missionDay?.idempotent
          ? `${label} — already applied.`
          : `${label} — saved.`,
      );
      startTransition(() => router.refresh());
    } catch {
      setError("Network error. Check connection and retry.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mission-day-actions">
      <div className="button-row mission-day-action-row">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={
              action === "NEEDS_ATTENTION" ? "button secondary" : "button"
            }
            disabled={isPending || pendingAction !== null}
            onClick={() => void run(action)}
          >
            {pendingAction === action
              ? "Saving…"
              : MISSION_DAY_ACTION_LABELS[action]}
          </button>
        ))}
      </div>
      {success ? (
        <p className="mission-day-feedback ok" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <div className="mission-day-feedback err" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setError(null);
              startTransition(() => router.refresh());
            }}
          >
            Refresh
          </button>
        </div>
      ) : null}
    </div>
  );
}
