import type { Metadata } from "next";
import { SandboxTestConsole } from "@/components/communications/providers/SandboxTestConsole";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getSandboxConsole } from "@/server/services/communications-provider-service";

export const metadata: Metadata = {
  title: "Sandbox console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SandboxConsolePage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/providers/sandbox",
  );
  const initial = await getSandboxConsole(actor);
  return <SandboxTestConsole initial={initial} />;
}
