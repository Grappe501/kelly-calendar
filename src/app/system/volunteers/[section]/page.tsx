import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "Volunteer workspace" };
export const dynamic = "force-dynamic";

const TITLES: Record<string, { title: string; blurb: string }> = {
  people: { title: "People", blurb: "Volunteer profiles linked intentionally to local identities." },
  intake: { title: "Intake", blurb: "Short friendly intake — consent stays on D20 contracts." },
  placement: { title: "Placement", blurb: "Human-reviewed placement — never auto-assign." },
  opportunities: { title: "Opportunities", blurb: "Volunteer-sized claimable work from Mission needs." },
  assignments: { title: "Assignments", blurb: "PROPOSED → CONFIRMED → CHECKED_IN — distinct from RSVP." },
  shifts: { title: "Shifts", blurb: "Shift windows from needs and staffing — capacity and waitlist." },
  training: { title: "Training", blurb: "Catalog and explicit completion attribution." },
  skills: { title: "Skills", blurb: "Approved taxonomy · interested → trainer." },
  availability: { title: "Availability", blurb: "Availability never assigns a person." },
  retention: { title: "Retention", blurb: "Deterministic next-action facts — no hidden scoring." },
  leadership: { title: "Leadership development", blurb: "Interest and succession — human dispositions only." },
  counties: { title: "Counties", blurb: "IC-01 counties · vacant captains · maturity facts." },
  clusters: { title: "Clusters", blurb: "Six draft clusters from IC-02C." },
  "voter-engagement": { title: "Voter engagement", blurb: "Registration, contact, GOTV support." },
  youth: { title: "College and youth", blurb: "Campus pathways into county teams." },
  events: { title: "Events and distributed actions", blurb: "Staffing, setup, visibility actions." },
  calendar: { title: "Volunteer calendar", blurb: "Derived view of shifts and deadlines." },
  reports: { title: "Reports", blurb: "Explainable counts — no AI scores." },
  policy: { title: "Policy", blurb: "Privacy, consent, and assignment separation." },
};

export default async function VolunteerDrillPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await requireActiveAuthenticatedActor();
  const { section } = await params;
  const meta = TITLES[section] ?? {
    title: section,
    blurb: "Volunteer workspace",
  };

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader title={meta.title} principle={meta.blurb} />
      <p>
        <Link href="/system/volunteers">← Volunteer and Organizing</Link>
      </p>
      <section className="panel">
        <p>{meta.blurb}</p>
        <p className="muted">
          Quiet drill-down. No fabricated volunteers. Consent is never inferred from
          RSVP, attendance, or assignment.
        </p>
      </section>
    </div>
  );
}
