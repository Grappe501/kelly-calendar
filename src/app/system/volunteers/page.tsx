import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getVolunteerManagerHome } from "@/server/services/campaign-volunteer-service";

export const metadata: Metadata = { title: "Volunteer and Organizing" };
export const dynamic = "force-dynamic";

export default async function VolunteerManagerHomePage() {
  const actor = await requireActiveAuthenticatedActor();
  const home = await getVolunteerManagerHome(actor);

  return (
    <div className="page-stack volunteer-home">
      <CampaignOpsSuperHeader
        title={home.header.title}
        principle="Quiet by default — today, five priorities, urgent gaps"
      />
      <header className="panel">
        <p className="muted">{home.header.todayLabel}</p>
        <p>{home.header.posture}</p>
        <p className="todays-mission-header-links">
          <Link className="button" href={home.header.primaryAction.href}>
            {home.header.primaryAction.label}
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/system/volunteers/people">Search people</Link>
        </p>
      </header>

      <section className="panel" aria-labelledby="today-cal">
        <h2 id="today-cal">Today’s calendar</h2>
        {home.todayCalendar.length === 0 ? (
          <p className="muted">No volunteer shifts or deadlines on the board yet.</p>
        ) : (
          <ul>
            {home.todayCalendar.map((e) => (
              <li key={e.id}>
                <Link href={e.sourceHref}>{e.title}</Link>
                <span className="muted">
                  {" "}
                  · {e.volunteer} · {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">Derived view — Events are not copied.</p>
      </section>

      <section className="panel" aria-labelledby="priorities">
        <h2 id="priorities">Priority tasks</h2>
        <p className="muted">At most five · deterministic reasons · no AI ranking</p>
        <ol>
          {home.priorities.map((p) => (
            <li key={p.id}>
              <Link href={p.sourceHref}>{p.title}</Link>
              <span className="muted"> · tier {p.tier}</span>
              <ul>
                {p.reasons.map((r) => (
                  <li key={r} className="muted">
                    {r}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel" aria-labelledby="gaps">
        <h2 id="gaps">Urgent gaps</h2>
        <ul className="muted">
          <li>Awaiting placement: {home.needsAttention.awaitingPlacement}</li>
          <li>Awaiting confirmation: {home.needsAttention.awaitingConfirmation}</li>
          <li>Unfilled shifts: {home.needsAttention.unfilledShifts}</li>
          <li>County leadership gaps: {home.needsAttention.countyLeadershipGaps}</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="coords">
        <h2 id="coords">Coordinator status</h2>
        <ul>
          {home.coordinatorStatus.map((c) => (
            <li key={c.key}>
              <Link href={c.href}>{c.label}</Link>
              {c.vacant ? <span className="muted"> · needs support</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="drill">
        <h2 id="drill">Drill down</h2>
        <nav className="button-row" aria-label="Volunteer workspaces">
          {home.drillDown.map((d) => (
            <Link key={d.href} className="chip chip-link" href={d.href}>
              {d.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
