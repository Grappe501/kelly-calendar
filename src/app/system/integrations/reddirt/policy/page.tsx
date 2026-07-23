import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getRedDirtPolicy } from "@/server/services/reddirt-integration-service";

export const metadata: Metadata = { title: "RedDirt privacy policy" };
export const dynamic = "force-dynamic";

export default async function RedDirtPolicyPage() {
  await requireSystemAdminPage("/system/integrations/reddirt/policy");
  const actor = await requireActiveAuthenticatedActor();
  const policy = await getRedDirtPolicy(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>RedDirt data privacy policy</h1>
        <p>Deny-by-default. Person-level data is excluded in IC-02.</p>
      </header>
      <section className="panel">
        <ul className="plain-list">
          <li>Deny by default: {policy.denyByDefault ? "yes" : "no"}</li>
          <li>Allowed: {policy.allowedClasses.join(", ")}</li>
          <li>Denied: {policy.deniedClasses.join(", ")}</li>
          <li>Denied fields: {policy.deniedFields.join(", ")}</li>
          <li>Person import: {policy.personImport ? "yes" : "no"}</li>
          <li>Consent inference: {policy.consentInference ? "yes" : "no"}</li>
          <li>RedDirt writes: {policy.reddirtWrites ? "yes" : "no"}</li>
          <li>Model invocations: {policy.modelInvocations ? "yes" : "no"}</li>
          <li>Allowlist version: {policy.privacyAllowlistVersion}</li>
        </ul>
      </section>
      <Link className="button secondary" href="/system/integrations/reddirt">
        Back
      </Link>
    </div>
  );
}
