import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "Delegations" };
export const dynamic = "force-dynamic";

export default async function DelegationsPage() {
  await requireActiveAuthenticatedActor();
  return (
    <div className="page-stack">
      <h1>Delegated authority</h1>
      <p>
        Narrow, dated, audited delegations. Cannot exceed grantor authority. Expired or
        revoked grants no access. Schema ready — use with intentional manager actions.
      </p>
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
