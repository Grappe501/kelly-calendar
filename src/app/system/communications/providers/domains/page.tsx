import type { Metadata } from "next";
import { DomainVerificationCenter } from "@/components/communications/providers/DomainVerificationCenter";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getDomainVerificationCenter } from "@/server/services/communications-provider-service";

export const metadata: Metadata = {
  title: "Domain verification",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DomainVerificationPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/providers/domains",
  );
  const initial = await getDomainVerificationCenter(actor);
  return <DomainVerificationCenter initial={initial} />;
}
