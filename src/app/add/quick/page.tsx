import type { Metadata } from "next";
import { QuickEventForm } from "@/components/event-entry/quick-event-form";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = {
  title: "Add event",
};

export const dynamic = "force-dynamic";

export default async function QuickAddPage() {
  await requireActiveAuthenticatedActor();
  return <QuickEventForm />;
}
