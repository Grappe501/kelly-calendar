import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  createTemplateRecord,
  createTemplateVersionRecord,
  getCompositionWorkspaceHome,
} from "@/server/services/communications-composition-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/templates",
    async ({ actor }) => getCompositionWorkspaceHome(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/templates",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (typeof body?.templateId === "string") {
        return createTemplateVersionRecord(actor, body.templateId, {
          subjectTemplate:
            typeof body.subjectTemplate === "string" ? body.subjectTemplate : null,
          htmlTemplate:
            typeof body.htmlTemplate === "string" ? body.htmlTemplate : null,
          textTemplate:
            typeof body.textTemplate === "string" ? body.textTemplate : null,
          smsTemplate:
            typeof body.smsTemplate === "string" ? body.smsTemplate : null,
          requiredTokens: Array.isArray(body.requiredTokens)
            ? (body.requiredTokens as string[])
            : [],
          optionalTokens: Array.isArray(body.optionalTokens)
            ? (body.optionalTokens as string[])
            : [],
          complianceProfileKey:
            typeof body.complianceProfileKey === "string"
              ? body.complianceProfileKey
              : undefined,
          changeSummary:
            typeof body.changeSummary === "string" ? body.changeSummary : undefined,
        });
      }
      return createTemplateRecord(actor, {
        templateKey: typeof body?.templateKey === "string" ? body.templateKey : "",
        name: typeof body?.name === "string" ? body.name : "",
        channel: body?.channel === "SMS" ? "SMS" : "EMAIL",
        category:
          typeof body?.category === "string"
            ? (body.category as "TEST_ONLY")
            : "GENERAL_OUTREACH",
        description:
          typeof body?.description === "string" ? body.description : undefined,
      });
    },
  );
}
