import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SecondaryOperatingView } from "@/components/calendar/SecondaryOperatingView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import {
  getSecondaryOperatingViewData,
  isSecondaryOperatingLens,
} from "@/server/services/secondary-operating-view-service";

export const metadata: Metadata = {
  title: "Operating lens",
};

export const dynamic = "force-dynamic";

type Params = Promise<{ lens: string }>;
type SearchParams = Promise<{ date?: string }>;

/**
 * Secondary operating lenses — projections over the same Event graph.
 */
export default async function CalendarOpsLensPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lens } = await params;
  if (!isSecondaryOperatingLens(lens)) notFound();
  const query = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const data = await getSecondaryOperatingViewData(actor, lens, query.date);
  return <SecondaryOperatingView data={data} />;
}
