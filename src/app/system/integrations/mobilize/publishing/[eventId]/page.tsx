import type { Metadata } from "next";
import Link from "next/link";
import { MobilizeEventPublishingPanel } from "@/components/integrations/MobilizeEventPublishingPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize event publication",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function MobilizeEventPublishingPage({ params }: Props) {
  const { eventId } = await params;
  await requireSystemAdminPage(
    `/system/integrations/mobilize/publishing/${eventId}`,
  );
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Event → Mobilize</h1>
        <p>Event id: {eventId}</p>
      </header>
      <MobilizeEventPublishingPanel eventId={eventId} />
      <section className="panel">
        <Link
          className="button secondary"
          href="/system/integrations/mobilize/publishing"
        >
          All publishing
        </Link>
      </section>
    </div>
  );
}
