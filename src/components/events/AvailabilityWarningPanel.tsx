"use client";

import { useState } from "react";

export type AvailabilityFindingView = {
  key: string;
  severity: "blocking" | "warning" | "informational";
  classification: string;
  explanation: string;
  blocksSave: boolean;
  requiresAcknowledgement: boolean;
  overlapStartsAt: string;
  overlapEndsAt: string;
};

export type AvailabilityAssessmentView = {
  classification: string;
  findings: AvailabilityFindingView[];
  evaluationFingerprint: string;
  ruleSetFingerprint: string;
  truncated: boolean;
  evaluatedAt: string;
};

export type AvailabilityAcknowledgementPayload = {
  disposition: "ACKNOWLEDGED" | "ACCEPTED_RISK";
  reason?: string;
  evaluationFingerprint: string;
};

type Props = {
  assessment: AvailabilityAssessmentView;
  /** True when the last save attempt was rejected (409) pending acknowledgement. */
  requiresAction?: boolean;
  onAcknowledge?: (payload: AvailabilityAcknowledgementPayload) => void;
  busy?: boolean;
};

function fmtTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * CC-05 availability warning surface. Input-only — never auto-moves or
 * cancels the Event. Shows classification + findings and, when a finding
 * requires acknowledgement, a checkbox + reason field to accept the risk.
 */
export function AvailabilityWarningPanel({
  assessment,
  requiresAction,
  onAcknowledge,
  busy,
}: Props) {
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");

  const needsAck = assessment.findings.some((f) => f.requiresAcknowledgement);
  if (assessment.findings.length === 0 && assessment.classification === "AVAILABLE") {
    return null;
  }

  return (
    <section
      className={`panel availability-warning-panel${requiresAction ? " form-error" : ""}`}
      role={requiresAction ? "alert" : "status"}
      aria-labelledby="availability-warning-h"
    >
      <h3 id="availability-warning-h">
        Standing availability — {assessment.classification}
      </h3>
      {assessment.findings.length === 0 ? (
        <p className="muted">No standing availability findings for this time.</p>
      ) : (
        <ul>
          {assessment.findings.map((f) => (
            <li key={f.key}>
              <strong>{f.classification}</strong> ({f.severity}) ·{" "}
              {fmtTime(f.overlapStartsAt)}–{fmtTime(f.overlapEndsAt)} · {f.explanation}
            </li>
          ))}
        </ul>
      )}
      {assessment.truncated ? (
        <p className="muted">Rule expansion was truncated for this range.</p>
      ) : null}
      {needsAck ? (
        <div className="form-actions">
          {requiresAction ? (
            <p className="form-error">
              This save was blocked. Acknowledge the finding above (or change the
              time) before saving again.
            </p>
          ) : null}
          <label>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />{" "}
            I reviewed this and accept the risk of saving anyway
          </label>
          <label>
            Reason (recorded in the audit trail)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this exception is acceptable"
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={!checked || busy}
            onClick={() =>
              onAcknowledge?.({
                disposition: "ACCEPTED_RISK",
                reason: reason.trim() || undefined,
                evaluationFingerprint: assessment.evaluationFingerprint,
              })
            }
          >
            Accept risk &amp; retry save
          </button>
        </div>
      ) : (
        <p className="muted">Informational only — no acknowledgement required to save.</p>
      )}
    </section>
  );
}
