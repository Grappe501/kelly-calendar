import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "Geography reconciliation" };
export const dynamic = "force-dynamic";

export default async function GeographyReconciliationPage() {
  await requireActiveAuthenticatedActor();
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Geography reconciliation</h1>
        <p>
          Preview and apply Event/Mission geography links. Never mutates Event
          or Mission schedule fields. Match order: authoritative id →
          exact+context → alias → operator. Title-only matches are rejected.
        </p>
      </header>
      <section className="panel">
        <p className="muted">
          Use POST <code>/api/geography/reconciliation/preview</code> then{" "}
          <code>/api/geography/reconciliation/apply</code> with body fields:{" "}
          <code>subjectType</code> (EVENT|MISSION), <code>subjectId</code>,{" "}
          <code>authoritativeId</code>, <code>rawText</code>,{" "}
          <code>countyContext</code>, optional operator confirmation fields, and
          preview <code>fingerprint</code> on apply.
        </p>
      </section>
      <Link className="button secondary" href="/system/geography">
        Back
      </Link>
    </div>
  );
}
