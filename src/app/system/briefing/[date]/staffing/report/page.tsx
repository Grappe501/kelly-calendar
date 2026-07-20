import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertBriefingDateInRange } from "@/lib/missions/v21/day-briefing";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import {
  buildDayStaffingBoardView,
  type DayStaffingBoardView,
} from "@/lib/missions/v21/staffing/build-view-model";
import {
  labelStaffingPlanStatus,
  labelStaffingReadiness,
} from "@/lib/missions/v21/staffing/labels";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayStaffingReport } from "@/server/services/mission-staffing-service";

export const metadata: Metadata = {
  title: "Day Staffing Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

function CoverageSummary({ coverage }: { coverage: DayStaffingBoardView["missions"][number]["coverage"] }) {
  if (coverage.length === 0) {
    return <p className="muted">No staffing requirements.</p>;
  }
  return (
    <ul>
      {coverage.map((row) => (
        <li key={row.requirementId}>
          {row.roleLabel}: confirmed {row.confirmed}/{row.requiredCount}
          {row.remainingMinimumGap > 0
            ? ` · minimum gap ${row.remainingMinimumGap}`
            : ""}
        </li>
      ))}
    </ul>
  );
}

export default async function DayStaffingReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/staffing/report`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  const now = new Date();
  if (!assertBriefingDateInRange(date, now, tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const report = await getDayStaffingReport(date, actor);
  const model = buildDayStaffingBoardView(report, now);

  return (
    <article className="page-stack day-staffing-report">
      <header>
        <h1>Day Staffing Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">
          {model.campaignTimezone} · Generated {model.generatedAt}
        </p>
        <p role="note">
          Read-only report. Aggregate identity labels only — no contact fields.
          RSVP ≠ assignment ≠ check-in ≠ Execute.
        </p>
      </header>
      <section>
        <h2>Summary</h2>
        <ul>
          <li>Missions: {model.summary.missionCount}</li>
          <li>With staffing plans: {model.summary.withPlanCount}</li>
          <li>Without plans: {model.summary.withoutPlanCount}</li>
          <li>Blockers: {model.summary.blockerCount}</li>
          <li>Warnings: {model.summary.warningCount}</li>
          <li>Minimum gaps (total): {model.summary.totalGapCount}</li>
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
              {m.isCancelled ? " (Cancelled)" : ""}
            </h3>
            <p>
              {m.whenLabel} · Readiness: {labelStaffingReadiness(m.readiness)}
              {m.planStatus
                ? ` · Plan: ${labelStaffingPlanStatus(m.planStatus)}`
                : " · No plan"}
              {m.isStale ? " · Stale" : ""}
            </p>
            <p>
              Blockers: {m.findingCounts.blockers} · Warnings:{" "}
              {m.findingCounts.warnings} · Minimum gap: {m.totalGap}
            </p>
            <CoverageSummary coverage={m.coverage} />
          </section>
        ))}
      </section>
    </article>
  );
}
