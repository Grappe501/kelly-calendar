import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MissionDetailView } from "@/components/missions/MissionDetailView";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionHomeViewModelById } from "@/server/services/todays-mission-service";

export const metadata: Metadata = {
  title: "Mission record",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ missionId: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export default async function MissionDetailPage({ params, searchParams }: Ctx) {
  const { missionId } = await params;
  const { mode } = await searchParams;

  // Canonical phase workspaces — do not keep competing UIs.
  if (mode === "prepare") {
    redirect(`/system/missions/${missionId}/prepare`);
  }
  if (mode === "execute") {
    redirect(`/system/missions/${missionId}/execute`);
  }

  await requireSystemAdminPage(`/system/missions/${missionId}`);
  const mission = await getMissionHomeViewModelById(missionId);

  return <MissionDetailView mission={mission} mode={mode ?? null} />;
}
