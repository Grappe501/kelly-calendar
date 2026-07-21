import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EvaluationDetailPanel } from "@/components/communications/audiences/EvaluationDetailPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getEvaluationDetail } from "@/server/services/communications-audience-service";

export const metadata: Metadata = {
  title: "Audience evaluation",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ audienceId: string; evaluationId: string }>;
};

export default async function EvaluationPage({ params }: Props) {
  const { audienceId, evaluationId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/audiences/${audienceId}/evaluations/${evaluationId}`,
  );
  try {
    const initial = await getEvaluationDetail(actor, evaluationId);
    return (
      <EvaluationDetailPanel audienceId={audienceId} initial={initial} />
    );
  } catch {
    notFound();
  }
}
