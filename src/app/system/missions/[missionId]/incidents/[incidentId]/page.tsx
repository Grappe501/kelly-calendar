import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MissionIncidentDetail } from "@/components/missions/incidents/MissionIncidentDetail";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { findIncidentById } from "@/server/repositories/mission-incident-repository";
import { getIncidentDetail } from "@/server/services/mission-incident-service";

export const metadata: Metadata = {
  title: "Mission Incident",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string; incidentId: string }> };

export default async function MissionIncidentDetailPage({ params }: Ctx) {
  const { missionId, incidentId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/incidents/${incidentId}`,
  );
  const incident = await findIncidentById(incidentId);
  if (!incident || incident.missionId !== missionId) notFound();
  const detail = await getIncidentDetail(incidentId, actor);
  return <MissionIncidentDetail initial={detail} />;
}
