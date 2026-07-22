"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AvailabilityRuleListItem } from "@/components/calendar/availability/AvailabilityRulesPanel";

type Rule = AvailabilityRuleListItem & {
  timezone: string;
  locationHint: string | null;
  visibilityNote: string | null;
  source: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
};

export function AvailabilityRuleDetailPanel({ initial }: { initial: Rule }) {
  const router = useRouter();
  const [rule, setRule] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runOp(op: "approve" | "deactivate") {
    setBusy(true);
    setMessage(null);
    try {
      const reason =
        op === "deactivate" ? window.prompt("Deactivate reason (optional)") ?? undefined : undefined;
      const res = await fetch(`/api/calendar/availability/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Action failed.");
      setRule(json.rule);
      setMessage(op === "approve" ? "Rule approved and active." : "Rule deactivated.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>{rule.label}</h1>
        <p className="muted">
          <Link href="/system/calendar/availability">Back to rules</Link>
        </p>
      </header>

      {message ? <p className="panel">{message}</p> : null}

      <section className="panel">
        <dl className="briefing-dl">
          <dt>Type</dt>
          <dd>{rule.ruleType}</dd>
          <dt>Classification</dt>
          <dd>{rule.classification}</dd>
          <dt>Approval state</dt>
          <dd>
            {rule.approvalState} {rule.isActive ? "· active" : "· inactive"}
          </dd>
          <dt>Timezone</dt>
          <dd>{rule.timezone}</dd>
          <dt>Effective</dt>
          <dd>
            {rule.effectiveStartDate} – {rule.effectiveEndDate ?? "ongoing"}
          </dd>
          <dt>Window</dt>
          <dd>
            {rule.startLocalTime && rule.endLocalTime
              ? `${rule.startLocalTime}–${rule.endLocalTime}`
              : "All-day"}
          </dd>
          <dt>Weekdays</dt>
          <dd>{rule.weekdays.length === 0 ? "Every day" : rule.weekdays.join(", ")}</dd>
          <dt>Priority</dt>
          <dd>{rule.priority}</dd>
          <dt>Location hint</dt>
          <dd>{rule.locationHint ?? "—"}</dd>
          <dt>Source</dt>
          <dd>{rule.source}</dd>
          <dt>Approved at</dt>
          <dd>{rule.approvedAt ?? "Not yet approved"}</dd>
        </dl>
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy || rule.approvalState === "ACTIVE"}
            onClick={() => void runOp("approve")}
          >
            Approve (activate)
          </button>
          <button
            type="button"
            className="button"
            disabled={busy || !rule.isActive}
            onClick={() => void runOp("deactivate")}
          >
            Deactivate
          </button>
        </div>
        <p className="muted">
          Approving or deactivating never moves, cancels, or resolves an Event —
          it only changes whether this rule is used in future evaluations.
        </p>
      </section>
    </div>
  );
}
