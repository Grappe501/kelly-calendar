import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertLaunchDateInRange } from "@/lib/missions/v21/day-launch";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCampaignDayLaunchReview } from "@/server/services/campaign-day-launch-review-service";

export const metadata: Metadata = {
  title: "Morning Launch Report",
  description: "Internal campaign morning launch report.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function LaunchReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/launch/report`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertLaunchDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getCampaignDayLaunchReview({ dateKey: date, actor });

  return (
    <article className="page-stack campaign-day-launch-report">
      <header>
        <h1>Morning Launch Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">
          {model.timezone} · Generated {model.generatedAt}
        </p>
        <p>
          Status: {model.launchReview.statusLabel} · Readiness:{" "}
          {model.launchReview.readinessAssessmentLabel}
        </p>
      </header>
      {model.historicalNotice ? (
        <p className="briefing-disclaimer" role="note">
          {model.historicalNotice}
        </p>
      ) : null}
      <section>
        <h2>Summary</h2>
        <ul>
          <li>{model.summary.missionCount} Missions scheduled</li>
          <li>{model.summary.overnightChangeCount} overnight changes</li>
          <li>{model.summary.blockingConditionCount} blockers</li>
          <li>{model.summary.acceptedRiskCount} accepted risks</li>
          <li>
            First Mission: {model.summary.firstMissionTitle ?? "None"} ·{" "}
            {model.summary.firstMissionTime ?? "—"}
          </li>
        </ul>
      </section>
      <section>
        <h2>Launch summary</h2>
        <p>{model.launchReview.launchSummary || "No launch summary entered."}</p>
      </section>
      <section>
        <h2>Accepted risks</h2>
        {model.acceptedRisks.length === 0 ? (
          <p className="muted">None</p>
        ) : (
          <ul>
            {model.acceptedRisks.map((r) => (
              <li key={r.id}>
                {r.title} — {r.reason}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>Authorization</h2>
        <p>Reviewed by: {model.launchReview.reviewedByUserId ?? "—"}</p>
        <p>Launched by: {model.launchReview.launchedByUserId ?? "—"}</p>
        <p className="muted">
          Launch authorizes the campaign to begin the day. It does not start
          Mission execution.
        </p>
      </section>
      <p className="no-print">
        <Link href={`/system/briefing/${date}/launch`}>Back to Launch Review</Link>
      </p>
    </article>
  );
}
