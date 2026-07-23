import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { OrganizationInstallClient } from "@/components/organization/OrganizationInstallClient";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationStatus } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Campaign organization" };
export const dynamic = "force-dynamic";

export default async function OrganizationHomePage() {
  const actor = await requireActiveAuthenticatedActor();
  const status = await getOrganizationStatus(actor);

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title="Campaign organization"
        principle="People over politics — building lasting local leadership"
      />
      <p>
        Lean four-lane structure: Volunteer & Organizing · Communications · Finance ·
        Operations & Data. Positions stay vacant until intentionally assigned.
      </p>
      <OrganizationInstallClient initial={status as never} />
      <nav className="button-row" aria-label="Organization sections">
        <Link className="chip chip-link" href="/system/organization/departments">
          Departments
        </Link>
        <Link className="chip chip-link" href="/system/organization/assignments">
          Assignments
        </Link>
        <Link className="chip chip-link" href="/system/organization/counties">
          Counties
        </Link>
        <Link className="chip chip-link" href="/system/organization/delegations">
          Delegations
        </Link>
        <Link className="chip chip-link" href="/system/organization/audit">
          Audit
        </Link>
        <Link className="chip chip-link" href="/system/operations">
          Operations
        </Link>
        <Link className="chip chip-link" href="/system/my-work">
          My Work
        </Link>
      </nav>
    </div>
  );
}
