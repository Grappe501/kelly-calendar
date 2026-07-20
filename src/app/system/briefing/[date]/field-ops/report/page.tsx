import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertFieldOpsDateInRange } from "@/lib/missions/v21/field-ops";
import { labelFieldOpsSessionStatus } from "@/lib/missions/v21/field-ops";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayFieldOpsBoard } from "@/server/services/mission-field-ops-service";

export const metadata: Metadata = {
  title: "Day Field Ops Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayFieldOpsReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/field-ops/report`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertFieldOpsDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayFieldOpsBoard({ dateKey: date, actor });

  return (
    <article className="page-stack day-field-ops-report">
      <header>
        <h1>Day Field Ops Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">{model.timezone} · Generated {model.generatedAt}</p>
        <p role="note">
          Read-only report. No field ops records are created by opening this page.
        </p>
      </header>
      <section>
        <h2>Summary</h2>
        <ul>
          <li>Missions: {model.summary.missionCount}</li>
          <li>With sessions: {model.summary.withSessionCount}</li>
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
              {m.whenLabel} · {m.readinessLabel}
              {m.sessionStatus
                ? ` · Session: ${labelFieldOpsSessionStatus(m.sessionStatus)}`
                : ""}
            </p>
            <p>
              Critical unconfirmed: {m.criticalUnconfirmedCount} · Outstanding
              returns: {m.outstandingReturnCount}
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
