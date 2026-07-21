import type { Metadata } from "next";
import { AudienceWorkspaceHome } from "@/components/communications/audiences/AudienceWorkspaceHome";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getAudienceWorkspaceHome } from "@/server/services/communications-audience-service";

export const metadata: Metadata = {
  title: "Audiences",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AudiencesPage() {
  const actor = await requireSystemAdminPage("/system/communications/audiences");
  const initial = await getAudienceWorkspaceHome(actor);
  return <AudienceWorkspaceHome initial={initial} />;
}
