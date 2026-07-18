import { oiAuthRequired } from "@/lib/api/auth-required-route";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return oiAuthRequired(request, "/api/command-summary/week");
}
