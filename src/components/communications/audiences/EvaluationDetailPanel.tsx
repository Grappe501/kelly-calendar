"use client";

import Link from "next/link";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type Props = {
  audienceId: string;
  initial: {
    notices: string[];
    evaluation: {
      id: string;
      evaluationType: string;
      status: string;
      candidateCount: number;
      includedCount: number;
      excludedCount: number;
      consentBlockedCount: number;
      suppressedCount: number;
      invalidDestinationCount: number;
      duplicatePersonCount: number;
      duplicateDestinationCount: number;
      limitApplied: boolean;
      criteriaHash: string;
      sourceFingerprint: string;
    };
    candidates: Array<{
      localPersonId: string | null;
      candidateStatus: string;
      destinationMasked: string | null;
      inclusionReasons: string[];
      exclusionReasons: string[];
    }>;
  };
};

function reasonLabel(r: string): string {
  return r;
}

export function EvaluationDetailPanel({ audienceId, initial }: Props) {
  const e = initial.evaluation;
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D24 Evaluation</p>
        <h1>
          {e.evaluationType} · {e.status}
        </h1>
        <DispatchAdminNav />
        <p>
          <Link href={`/system/communications/audiences/${audienceId}`}>
            ← Audience
          </Link>
        </p>
      </header>
      <CommunicationsNotices notices={initial.notices} />
      <section className="briefing-section">
        <h2>Summary</h2>
        <ul className="briefing-fact-list">
          <li>Candidates: {e.candidateCount}</li>
          <li>Included: {e.includedCount}</li>
          <li>Excluded: {e.excludedCount}</li>
          <li>Consent blocked: {e.consentBlockedCount}</li>
          <li>Suppressed: {e.suppressedCount}</li>
          <li>Invalid destination: {e.invalidDestinationCount}</li>
          <li>Duplicate person: {e.duplicatePersonCount}</li>
          <li>Duplicate destination: {e.duplicateDestinationCount}</li>
          <li>Limit applied: {e.limitApplied ? "yes" : "no"}</li>
          <li>Criteria hash: {e.criteriaHash.slice(0, 16)}…</li>
          <li>Source fingerprint: {e.sourceFingerprint.slice(0, 16)}…</li>
        </ul>
      </section>
      <section className="briefing-section">
        <h2>Candidates (masked)</h2>
        <ul className="briefing-fact-list">
          {initial.candidates.map((c, i) => (
            <li key={`${c.localPersonId}-${i}`}>
              {c.localPersonId} · {c.candidateStatus} ·{" "}
              {c.destinationMasked ?? "—"} · in{" "}
              {c.inclusionReasons.map(reasonLabel).join(", ") || "—"} · out{" "}
              {c.exclusionReasons.map(reasonLabel).join(", ") || "—"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
