import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Hot wash" };
export const dynamic = "force-dynamic";

type Params = Promise<{ eventId: string }>;

/** Hot wash shares the mobile outcome workflow. */
export default async function EventHotWashPage({ params }: { params: Params }) {
  const { eventId } = await params;
  redirect(`/system/events/${eventId}/outcome`);
}
