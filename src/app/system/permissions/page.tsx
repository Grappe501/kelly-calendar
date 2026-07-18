import Link from "next/link";
import { MUTATION_ACTIONS } from "@/server/auth/actions";
import { authorize } from "@/server/auth/authorization";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const actor = await requireSystemAdminPage("/system/permissions");

  const sample = await Promise.all(
    (
      [
        "EVENT_CREATE",
        "EVENT_EDIT",
        "EVENT_COMMUNICATIONS_EDIT",
        "WORKFLOW_APPLY",
        "CONFLICT_OVERRIDE",
        "SYSTEM_ROLE_MANAGE",
        "HISTORICAL_IMPORT_APPROVE",
      ] as const
    ).map(async (action) => {
      const result = await authorize(actor, {
        action,
        resource: { type: "system" },
      });
      return { action, ...result };
    }),
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Engineering validation</p>
        <h1>Permissions</h1>
        <p className="muted">
          Action-based authorization sample for the current leadership actor.
          Default remains deny for unauthorized actors.
        </p>
      </header>

      <section className="panel">
        <h2>Sample decisions</h2>
        <ul>
          {sample.map((row) => (
            <li key={row.action}>
              {row.action}: {row.allowed ? "ALLOW" : "DENY"} — {row.reason}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Action registry ({MUTATION_ACTIONS.length})</h2>
        <ul>
          {MUTATION_ACTIONS.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </section>

      <div className="button-row">
        <Link className="button secondary" href="/system/step-5-6">
          Step 5.6
        </Link>
      </div>
    </div>
  );
}
