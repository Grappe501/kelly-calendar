import { TodayOperatingView } from "@/components/today/TodayOperatingView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getTodayOperatingViewData } from "@/server/services/today-operating-view-service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ date?: string }>;

/**
 * Flagship Today operating view — canonical Event graph, mission-driven cards.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const data = await getTodayOperatingViewData(actor, params.date);

  return <TodayOperatingView data={data} />;
}
