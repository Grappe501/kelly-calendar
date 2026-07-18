import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkflowById } from "@/features/operational-intelligence/workflow-definitions/registry";

export const metadata: Metadata = { title: "Workflow detail" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ workflowId: string }> };

export default async function WorkflowDetailPage({ params }: Props) {
  const { workflowId } = await params;
  const workflow = getWorkflowById(workflowId);
  if (!workflow) notFound();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>
          {workflow.name}{" "}
          <span className="muted">v{workflow.version}</span>
        </h1>
        <p>{workflow.description}</p>
      </header>
      <section className="panel">
        <h2>Defaults</h2>
        <p>Duration: {workflow.defaultDurationMinutes ?? "—"} minutes</p>
        <p>Packing items: {workflow.defaultPackingItems.length}</p>
        <p>Staff roles: {workflow.defaultStaffingRoles.length}</p>
        <p>Actions: {workflow.defaultActionItems.length}</p>
        <p>Communications: {workflow.defaultCommunicationsItems.length}</p>
      </section>
    </div>
  );
}
