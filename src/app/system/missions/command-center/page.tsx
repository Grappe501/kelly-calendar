import type { Metadata } from "next";
import { MissionCommandCenter } from "@/components/missions/command-center/MissionCommandCenter";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionCommandCenter } from "@/server/services/mission-command-center-service";

export const metadata: Metadata = {
  title: "Mission Command Center",
  description:
    "Internal campaign operating view — what is active, what is next, and what needs leadership attention.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function MissionCommandCenterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSystemAdminPage("/system/missions/command-center");
  const sp = await searchParams;

  const model = await getMissionCommandCenter({
    filters: {
      view: first(sp.view),
      phase: first(sp.phase),
      search: first(sp.search),
    },
  });

  return <MissionCommandCenter model={model} />;
}
