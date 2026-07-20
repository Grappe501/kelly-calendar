import { TodaysMissionSurface } from "@/components/missions/TodaysMissionSurface";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getTodaysMissionResult } from "@/server/services/todays-mission-service";

export const dynamic = "force-dynamic";

/**
 * V2.1 Deliverable 2 — Today’s Mission operating surface.
 * Calendar remains secondary navigation; legacy Mission Cards are unchanged elsewhere.
 */
export default async function TodayPage() {
  await requireActiveAuthenticatedActor();
  const result = await getTodaysMissionResult();

  return <TodaysMissionSurface result={result} />;
}
