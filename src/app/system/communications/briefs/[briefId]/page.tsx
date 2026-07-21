import type { Metadata } from "next";
import Link from "next/link";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { findBrief } from "@/server/repositories/communications-composition-repository";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Brief",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ briefId: string }> };

export default async function BriefDetailPage({ params }: Props) {
  const { briefId } = await params;
  await requireSystemAdminPage(`/system/communications/briefs/${briefId}`);
  const brief = await findBrief(briefId);
  if (!brief) notFound();
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D23 Brief (not dispatchable)</p>
        <h1>{brief.purpose}</h1>
        <DispatchAdminNav />
      </header>
      <ul className="briefing-fact-list">
        <li>Channel: {brief.channel}</li>
        <li>Status: {brief.status}</li>
        <li>Objective: {brief.objective ?? "—"}</li>
        <li>Audience: {brief.audienceDescription ?? "—"}</li>
        <li>Compositions: {brief.compositions.length}</li>
      </ul>
      <Link href="/system/communications/briefs">Back</Link>
    </div>
  );
}
