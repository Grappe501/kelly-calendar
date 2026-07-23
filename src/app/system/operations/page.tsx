import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "Campaign operations" };
export const dynamic = "force-dynamic";

const BOARDS = [
  { href: "/system/volunteers", title: "Volunteer and Organizing", blurb: "Quiet home · five priorities · placement" },
  { href: "/system/operations/assistant-campaign-manager", title: "Assistant Campaign Manager", blurb: "Campaign-wide work coordination" },
  { href: "/system/logistics", title: "Campaign Logistics", blurb: "Reports to Campaign Manager · reuses D11–D13" },
  { href: "/system/work", title: "Campaign work", blurb: "One work graph · source-linked tasks" },
  { href: "/system/operations/finance", title: "Finance", blurb: "Compliance & fundraising posture (restricted)" },
  { href: "/system/operations/data", title: "Operations & Data", blurb: "Calendar, activation routing, systems" },
  { href: "/system/operations/events", title: "Events Management", blurb: "Hosts, RSVP, posture, readiness" },
  { href: "/system/operations/communications", title: "Communications Manager", blurb: "Email, SMS, social, press — D20 coordinated" },
  { href: "/system/operations/volunteers", title: "Activation volunteer needs", blurb: "IC-02B needs inbox — no auto-assign" },
  { href: "/system/operations/logistics", title: "Ops logistics (legacy)", blurb: "Links into briefing boards" },
  { href: "/system/operations/field", title: "Field operations", blurb: "Canvass, phone bank, volunteer field" },
  { href: "/system/operations/tasks", title: "All activation tasks", blurb: "Cross-department task list" },
  { href: "/system/operations/notifications", title: "Notifications inbox", blurb: "Internal deep-links — no push claimed" },
  { href: "/system/operations/templates", title: "Playbook templates", blurb: "Versioned standard timelines" },
] as const;

export default async function OperationsHubPage() {
  await requireActiveAuthenticatedActor();
  return (
    <div className="page-stack operations-hub">
      <CampaignOpsSuperHeader
        title="Campaign operations"
        principle="Turning complexity into clarity — Regnat Populus"
      />
      <p className="muted">
        Department boards route Mission activation work. Automation generates
        internal tasks only — external send/publish/purchase stays blocked until
        verified providers and approvals.
      </p>
      <div className="ops-board-grid">
        {BOARDS.map((b) => (
          <Link key={b.href} className="ops-board-card" href={b.href}>
            <h2>{b.title}</h2>
            <p>{b.blurb}</p>
          </Link>
        ))}
      </div>
      <div className="button-row">
        <Link className="button secondary" href="/system/missions/command-center">
          Mission Command Center
        </Link>
        <Link className="button secondary" href="/system/communications">
          D20 Communications queue
        </Link>
        <Link className="button secondary" href="/system/calendar/reviews">
          Event outcome reviews
        </Link>
      </div>
    </div>
  );
}
