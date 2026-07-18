import type { Metadata } from "next";
import Link from "next/link";
import { listWorkflows } from "@/features/operational-intelligence/workflow-definitions/registry";
import { listRuleCoverage } from "@/features/operational-intelligence/rules/rule-evaluator";
import { SYNTHETIC_EVENTS } from "@/features/operational-intelligence/fixtures/synthetic-events";
import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import { AUTH_STATUS } from "@/server/auth/auth-status";

export const metadata: Metadata = {
  title: "Step 5.5 — Operational intelligence",
};

export const dynamic = "force-dynamic";

export default function Step55Page() {
  const workflows = listWorkflows();
  const rules = listRuleCoverage();
  const demo = calculateEventReadiness({
    event: {
      id: "syn_demo",
      version: 1,
      eventType: "Festival Appearance",
      campaignDisplayTitle: "Pulaski County Festival",
      startsAt: new Date("2026-08-01T14:00:00-05:00"),
      endsAt: new Date("2026-08-01T17:00:00-05:00"),
      city: "Little Rock",
      staffRequiredCount: 3,
      staffAssignedCount: 1,
      packingCount: 8,
      packingPackedCount: 2,
      travelRequired: true,
      travelHasDriver: false,
    },
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Step 5.5 — Operational intelligence</h1>
        <p>
          Validation surface for workflows, rules, and readiness. Not the final mobile Command
          Calendar. Live event mutations remain{" "}
          {AUTH_STATUS.mutationApisAuthorized ? "authorized" : "disabled"} until Step 4 AUTH-RBAC.
        </p>
      </header>

      <section className="panel">
        <h2>Registry</h2>
        <p>
          Workflows: {workflows.length} · Rules: {rules.length} · Synthetic fixtures:{" "}
          {SYNTHETIC_EVENTS.length}
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/system/workflows">
            Workflows
          </Link>
          <Link className="button secondary" href="/system/operational-rules">
            Rules
          </Link>
          <Link className="button secondary" href="/system/readiness">
            Readiness demo
          </Link>
          <Link className="button secondary" href="/system/conflicts">
            Conflicts
          </Link>
          <Link className="button secondary" href="/system/patterns">
            Patterns
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Synthetic readiness demo</h2>
        <p>
          Score: {demo.overallScore}% · Level: {demo.readinessLevel} · Critical blockers:{" "}
          {demo.criticalBlockers.length}
        </p>
        <ul>
          {demo.criticalBlockers.map((b) => (
            <li key={b.code}>{b.message}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
