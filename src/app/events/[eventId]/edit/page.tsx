import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eventSheetHref } from "@/lib/calendar/event-sheet-href";

export const metadata: Metadata = {
  title: "Event",
};

export const dynamic = "force-dynamic";

type Params = Promise<{ eventId: string }>;

/** Legacy `/edit` path redirects to the canonical event sheet. */
export default async function EventEditRedirectPage({ params }: { params: Params }) {
  const { eventId } = await params;
  redirect(eventSheetHref(eventId));
}
