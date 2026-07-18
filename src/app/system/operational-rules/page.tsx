import type { Metadata } from "next";
import { listRuleCoverage } from "@/features/operational-intelligence/rules/rule-evaluator";

export const metadata: Metadata = { title: "Operational rules" };
export const dynamic = "force-dynamic";

export default function OperationalRulesPage() {
  const rules = listRuleCoverage();
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Deterministic operational rules</h1>
        <p>Rules generate suggestions only. Human approval required for any mutation.</p>
      </header>
      <section className="panel">
        <ul>
          {rules.map((r) => (
            <li key={r.id}>
              <code>{r.id}</code> — {r.category} (precedence {r.precedenceRank})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
