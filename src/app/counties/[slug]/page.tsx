import { notFound } from "next/navigation";
import { CountyCommandNodeView } from "@/components/counties/CountyCommandNodeView";
import { findCountyNode } from "@/lib/missions/county-operations";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCountyOperations } from "@/server/services/county-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CountyCommandNodePage({ params }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const { slug } = await params;
  const data = await getCountyOperations(actor);
  const county = findCountyNode(data.counties, slug);
  if (!county) notFound();

  return (
    <CountyCommandNodeView
      county={county}
      date={data.counties.date}
      timezone={data.counties.timezone}
    />
  );
}
