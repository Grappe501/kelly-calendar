import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getOrganizationDirectory,
  getOrganizationStatus,
  installOrganization,
  mutateAssignment,
  previewOrganizationTemplate,
} from "@/server/services/campaign-organization-service";

export const dynamic = "force-dynamic";

function gate(actor: { primarySystemRole: string }) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole as never)) {
    throw new PermissionDeniedError("Organization requires campaign access.");
  }
}

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/organization",
    async ({ actor }) => {
      gate(actor);
      const url = new URL(request.url);
      const view = url.searchParams.get("view") ?? "status";
      if (view === "directory") return getOrganizationDirectory(actor);
      if (view === "preview") return previewOrganizationTemplate(actor);
      return getOrganizationStatus(actor);
    },
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/organization",
    async ({ actor }) => {
      gate(actor);
      const body = (await request.json().catch(() => null)) ?? {};
      const action = (body as { action?: string }).action;
      if (action === "preview") return previewOrganizationTemplate(actor);
      if (action === "install") {
        return installOrganization(actor, body as Record<string, unknown>);
      }
      if (action === "assignment") {
        return mutateAssignment(actor, body as Record<string, unknown>);
      }
      return installOrganization(actor, body as Record<string, unknown>);
    },
  );
}
