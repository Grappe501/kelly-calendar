import type { Metadata } from "next";
import Link from "next/link";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

export const metadata: Metadata = {
  title: "Recipient conflicts",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RecipientConflictsPage() {
  await requireSystemAdminPage("/system/communications/recipients/conflicts");
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D24 Audience</p>
        <h1>Recipient conflicts</h1>
        <p className="muted">
          Duplicate destinations block manifest approval. Resolve by correcting
          canonical contact points — the system will not pick a winner.
        </p>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices
        notices={[
          d22ProductionDispatchHardBlock().reason,
          "DISPATCH BLOCKED FOR DUPLICATE DESTINATION until operators resolve conflicts.",
          "Eligible at manifest creation does not guarantee eligibility at dispatch.",
        ]}
      />
      <section className="briefing-section">
        <h2>How to resolve</h2>
        <ol>
          <li>Open the audience evaluation showing duplicate destination counts.</li>
          <li>Identify masked destinations shared by multiple people.</li>
          <li>Correct contact points on the canonical person records.</li>
          <li>Re-run review evaluation and regenerate the manifest.</li>
        </ol>
        <p>
          <Link href="/system/communications/audiences">← Audiences</Link>
        </p>
      </section>
    </div>
  );
}
