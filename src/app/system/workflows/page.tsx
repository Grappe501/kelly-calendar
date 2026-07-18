import type { Metadata } from "next";
import Link from "next/link";
import { listWorkflows } from "@/features/operational-intelligence/workflow-definitions/registry";

export const metadata: Metadata = { title: "Workflow registry" };
export const dynamic = "force-dynamic";

export default function WorkflowsPage() {
  const workflows = listWorkflows();
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Workflow registry</h1>
        <p>{workflows.length} system workflows (versioned definitions).</p>
      </header>
      <section className="panel">
        <ul>
          {workflows.map((w) => (
            <li key={w.id}>
              <Link href={`/system/workflows/${w.id}`}>
                {w.name} v{w.version}
              </Link>{" "}
              — {w.supportedEventTypes.join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
