import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { PLAYBOOK_CATALOG } from "@/lib/missions/activation/templates";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "Activation templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireActiveAuthenticatedActor();
  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader title="Playbook templates" />
      <p className="muted">
        Versioned campaign-owned templates. Installing templates does not create
        Mission plans.
      </p>
      <ul>
        {PLAYBOOK_CATALOG.map((t) => (
          <li key={t.code} className="panel" style={{ marginBottom: 12 }}>
            <h2>
              {t.title}{" "}
              <span className="muted">
                ({t.code} v{t.version})
              </span>
            </h2>
            <p>{t.description}</p>
            <p className="muted">{t.steps.length} steps</p>
          </li>
        ))}
      </ul>
      <Link className="button secondary" href="/system/operations">
        Ops hub
      </Link>
    </div>
  );
}
