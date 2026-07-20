import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertMovementDateInRange } from "@/lib/missions/v21/travel-movement";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayMovementBoard } from "@/server/services/mission-travel-service";

export const metadata: Metadata = {
  title: "Day Movement Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayMovementReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/movement/report`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertMovementDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayMovementBoard({ dateKey: date, actor });

  return (
    <article className="page-stack day-movement-report">
      <header>
        <h1>Day Movement Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">{model.timezone} · Generated {model.generatedAt}</p>
        <p role="note">
          Read-only report. No travel records are created by opening this page.
        </p>
      </header>
      <section>
        <h2>Summary</h2>
        <ul>
          <li>Missions: {model.summary.missionCount}</li>
          <li>With plans: {model.summary.withPlanCount}</li>
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
            </p>
            <p>
              Departure: {m.departureLabel ?? "Not set"} · Arrival:{" "}
              {m.arrivalLabel ?? "Not set"} · Driver: {m.driverLabel ?? "Not set"}
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
