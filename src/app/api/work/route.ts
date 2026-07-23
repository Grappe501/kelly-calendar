import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import {
  getAssistantCampaignManagerHome,
  getCampaignLogisticsBoard,
  getWorkPortfolio,
} from "@/server/services/campaign-volunteer-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/work", async ({ actor }) => {
    if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
      throw new PermissionDeniedError("Work board requires campaign access.");
    }
    const view = new URL(request.url).searchParams.get("view") ?? "acm";
    if (view === "portfolio") return getWorkPortfolio(actor);
    if (view === "logistics") return getCampaignLogisticsBoard(actor);
    return getAssistantCampaignManagerHome(actor);
  });
}
