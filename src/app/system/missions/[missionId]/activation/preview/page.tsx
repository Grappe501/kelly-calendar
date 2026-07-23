import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Activation preview" };
export const dynamic = "force-dynamic";

type Params = Promise<{ missionId: string }>;

export default async function ActivationPreviewPage({ params }: { params: Params }) {
  const { missionId } = await params;
  redirect(`/system/missions/${missionId}/activation`);
}
