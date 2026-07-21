import type { Metadata } from "next";
import Link from "next/link";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getTemplateDetail } from "@/server/services/communications-composition-service";

export const metadata: Metadata = {
  title: "Template",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ templateId: string }> };

export default async function TemplateDetailPage({ params }: Props) {
  const { templateId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/templates/${templateId}`,
  );
  const detail = await getTemplateDetail(actor, templateId);
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D23 Template</p>
        <h1>{detail.template.name}</h1>
        <p className="muted">
          {detail.template.templateKey} · {detail.template.channel} ·{" "}
          {detail.template.status}
        </p>
        <DispatchAdminNav />
      </header>
      <section className="briefing-section">
        <h2>Versions (approved versions are immutable)</h2>
        <ul className="briefing-fact-list">
          {detail.versions.map((v) => (
            <li key={v.id}>
              v{v.versionNumber} · {v.status} · {v.complianceProfileKey} · hash{" "}
              {v.contentHash.slice(0, 12)}…
            </li>
          ))}
        </ul>
        <Link href="/system/communications/templates">Back to templates</Link>
      </section>
    </div>
  );
}
