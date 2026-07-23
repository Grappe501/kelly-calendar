import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  await requireActiveAuthenticatedActor();
  return (
    <div className="page-stack">
      <h1>Position assignments</h1>
      <p>
        Propose assignments only against existing campaign users. PROPOSED grants no
        access. Name-only matching is blocked. Use API{" "}
        <code>POST /api/organization</code> with action <code>assignment</code>.
      </p>
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
