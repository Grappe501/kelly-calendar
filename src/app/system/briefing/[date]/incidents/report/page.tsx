import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertIncidentDateInRange } from "@/lib/missions/v21/incident-log";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayIncidentBoard } from "@/server/services/mission-incident-service";
import { labelFindingSeverity } from "@/lib/missions/v21/incident-log/labels";

export const metadata: Metadata = {
  title: "Day Incident Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayIncidentReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/incidents/report`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertIncidentDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayIncidentBoard({ dateKey: date, actor });

  return (
    <article className="page-stack day-incident-report">
      <header>
        <h1>Day Incident Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">
          {model.timezone} · Generated {model.generatedAt}
        </p>
        <p role="alert">{model.emergencyNotice}</p>
        <p role="note">
          Read-only report. Confidential narrative is omitted from board cards.
          No incident records are created by opening this page.
        </p>
      </header>
      <section>
        <h2>Summary</h2>
        <ul>
          <li>Missions: {model.summary.missionCount}</li>
          <li>Incidents: {model.summary.incidentCount}</li>
          <li>Active: {model.summary.activeCount}</li>
          <li>High/Critical: {model.summary.highCriticalCount}</li>
          <li>Blockers: {model.summary.blockerCount}</li>
          <li>Warnings: {model.summary.warningCount}</li>
          <li>First: {model.summary.firstMissionTitle ?? "None"}</li>
          <li>Primary: {model.summary.primaryMissionTitle ?? "None"}</li>
        </ul>
      </section>
      <section>
        <h2>Incidents</h2>
        {model.incidents.map((inc) => (
          <section key={inc.incidentId}>
            <h3>
              {inc.incidentRef}
              {inc.isArchived ? " (Archived)" : ""}
            </h3>
            <p>
              {inc.missionTitle} · {inc.whenLabel} · {inc.categoryLabel} ·{" "}
              {inc.severityLabel} · {inc.statusLabel}
            </p>
            {inc.summary ? <p>{inc.summary}</p> : null}
            {inc.findings.map((f) => (
              <p key={f.issueKey}>
                {labelFindingSeverity(f.severity)}: {f.title} — {f.explanation}
              </p>
            ))}
          </section>
        ))}
      </section>
    </article>
  );
}
