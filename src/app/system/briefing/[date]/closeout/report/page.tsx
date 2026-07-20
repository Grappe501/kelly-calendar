import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assertCloseoutDateInRange,
  parseBriefingDateKey,
} from "@/lib/missions/v21/day-closeout";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCampaignDayCloseout } from "@/server/services/campaign-day-closeout-service";

export const metadata: Metadata = {
  title: "Day Closeout Report",
  description: "Internal campaign day closeout report.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function CloseoutReportPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/closeout/report`);

  const parsed = parseBriefingDateKey(date);
  if (!parsed.ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertCloseoutDateInRange(date, new Date(), tz).ok) notFound();

  const actor = await requireActiveAuthenticatedActor();
  const model = await getCampaignDayCloseout({ dateKey: date, actor });

  return (
    <article className="page-stack campaign-day-closeout-report">
      <header>
        <h1>Campaign Day Closeout Report</h1>
        <p>{model.dateLabel}</p>
        <p className="muted">
          {model.timezone} · Generated {model.generatedAt}
        </p>
        <p>
          Status: {model.closeout.statusLabel} · Today:{" "}
          {model.closeout.todayAssessmentLabel} · Tomorrow:{" "}
          {model.closeout.tomorrowReadinessLabel}
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
          <li>{model.summary.scheduledMissions} Missions scheduled</li>
          <li>{model.summary.activeExecutions} active executions</li>
          <li>{model.summary.debriefAwaitingApproval} Debriefs awaiting approval</li>
          <li>{model.summary.openDueToday} open due-today actions</li>
          <li>{model.summary.overdue} overdue</li>
          <li>{model.summary.leadershipDecisions} leadership decisions</li>
        </ul>
      </section>

      <section>
        <h2>Closeout summary</h2>
        <p>{model.closeout.closeoutSummary || "No closeout summary entered."}</p>
      </section>

      <section>
        <h2>Tomorrow summary</h2>
        <p>
          {model.closeout.tomorrowSummary ||
            (model.tomorrowFirstMission
              ? "No tomorrow summary entered."
              : "No Missions are scheduled tomorrow.")}
        </p>
      </section>

      <section>
        <h2>Carry-forward register</h2>
        {model.carryForwardItems.length === 0 ? (
          <p className="muted">No carry-forward items.</p>
        ) : (
          <ul>
            {model.carryForwardItems.map((i) => (
              <li key={i.id}>
                {i.title} · {i.statusLabel} · {i.ownerLabel}
                {i.targetDateKey ? ` · target ${i.targetDateKey}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Reviewer and signoff</h2>
        <p>Reviewed by: {model.closeout.reviewedByUserId ?? "Not reviewed"}</p>
        <p>Reviewed at: {model.closeout.reviewedAt ?? "—"}</p>
        <p>Signed off by: {model.closeout.signedOffByUserId ?? "Not signed off"}</p>
        <p>Signed off at: {model.closeout.signedOffAt ?? "—"}</p>
        <p className="muted">
          Signoff confirms the day has been responsibly reviewed. It does not
          mark unresolved Mission work complete.
        </p>
      </section>

      <p className="no-print">
        <Link href={model.navigation.briefingHref}>Open Day Briefing</Link>
        {" · "}
        <Link href={`/system/briefing/${date}/closeout`}>Back to Closeout</Link>
      </p>
    </article>
  );
}
