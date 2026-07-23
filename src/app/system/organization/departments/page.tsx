import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationDirectory } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dir = await getOrganizationDirectory(actor);
  return (
    <div className="page-stack">
      <h1>Departments</h1>
      <ul>
        {dir.departments.map((d) => (
          <li key={d.key}>
            <strong>{d.displayName}</strong> · {d.privacyLevel} ·{" "}
            {d.functions.length} functions
          </li>
        ))}
      </ul>
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
