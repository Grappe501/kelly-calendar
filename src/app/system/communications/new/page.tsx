import type { Metadata } from "next";
import { Suspense } from "react";
import { CommunicationCreateForm } from "@/components/communications/CommunicationCreateForm";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "New communication",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewCommunicationPage() {
  await requireSystemAdminPage("/system/communications/new");
  return (
    <Suspense>
      <CommunicationCreateForm />
    </Suspense>
  );
}
