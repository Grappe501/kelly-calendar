import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertLogisticsDateInRange } from "@/lib/missions/v21/logistics-pack";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayLogisticsBoard } from "@/server/services/mission-logistics-service";

export const metadata: Metadata = {
  title: "Day Logistics Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayLogisticsReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/logistics/report`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertLogisticsDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayLogisticsBoard({ dateKey: date, actor });

  return (
    <article className="page-stack day-logistics-report">
      <header>
        <h1>Day Logistics Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">{model.timezone} · Generated {model.generatedAt}</p>
        <p role="note">
          Read-only report. No logistics records are created by opening this page.
        </p>
      </header>
      <section>
        <h2>Summary</h2>
        <ul>
          <li>Missions: {model.summary.missionCount}</li>
          <li>With packs: {model.summary.withPackCount}</li>
          <li>Blockers: {model.summary.blockerCount}</li>
          <li>Warnings: {model.summary.warningCount}</li>
          <li>First: {model.summary.firstMissionTitle ?? "None"}</li>
          <li>Primary: {model.summary.primaryMissionTitle ?? "None"}</li>
        </ul>
      </section>
      <section>
        <h2>Missions</h2>
        {model.missions.map((m) => (
          <section key={m.missionId}>
            <h3>
              {m.title}
              {m.isFirst ? " (First)" : ""}
              {m.isPrimary ? " (Primary)" : ""}
            </h3>
            <p>
              {m.whenLabel} · {m.readinessLabel} · Owner:{" "}
              {m.packOwnerName ?? "Not set"}
            </p>
            <p>
              Items: {m.itemCount} · Open handoffs: {m.openHandoffCount} ·
              Outstanding returns: {m.outstandingReturnCount}
            </p>
            {m.findings.map((f) => (
              <p key={f.issueKey}>
                {f.severityLabel}: {f.title} — {f.explanation}
              </p>
            ))}
          </section>
        ))}
      </section>
    </article>
  );
}
