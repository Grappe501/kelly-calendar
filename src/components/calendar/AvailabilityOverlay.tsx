/**
 * CC-05 — non-interactive availability overlay.
 * Renders classification as text (not color-only) for a set of expanded
 * intervals. Input-only: never mutates Events/Missions.
 */

export type AvailabilityOverlayInterval = {
  startsAt: string;
  endsAt: string;
  classification: string;
  label: string;
  explanation: string;
  ruleId?: string | null;
  exceptionId?: string | null;
};

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Non-interactive list overlay — safe to drop into any day/preview view. */
export function AvailabilityOverlay({
  intervals,
  emptyMessage = "No standing availability rules apply to this range.",
}: {
  intervals: AvailabilityOverlayInterval[];
  emptyMessage?: string;
}) {
  if (intervals.length === 0) {
    return <p className="muted availability-overlay-empty">{emptyMessage}</p>;
  }
  return (
    <ul className="availability-overlay" aria-label="Standing availability overlay">
      {intervals.map((iv, idx) => (
        <li
          key={`${iv.ruleId ?? iv.exceptionId ?? "iv"}-${iv.startsAt}-${idx}`}
          className="availability-overlay-item"
          data-classification={iv.classification}
        >
          <span className="availability-overlay-day">{fmtDay(iv.startsAt)}</span>{" "}
          <span className="availability-overlay-time">
            {fmtTime(iv.startsAt)}–{fmtTime(iv.endsAt)}
          </span>{" "}
          <span className="availability-overlay-classification">
            [{iv.classification}]
          </span>{" "}
          <span className="availability-overlay-label">{iv.label}</span>
        </li>
      ))}
    </ul>
  );
}
