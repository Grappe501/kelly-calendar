import type { Metadata } from "next";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listConflicts } from "@/server/services/conflict-engine-service";
import { ConflictQueuePanel } from "@/components/calendar/conflicts/ConflictQueuePanel";

export const metadata: Metadata = {
  title: "Conflict engine",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * CC-06 operator queue — `/system/conflicts` (ADR-092). Protected by
 * `requireSystemAdminPage`. Lists persisted OperationalConflictRecord rows
 * with disposition controls. Never auto-resolves; every disposition here
 * calls an audited server action.
 */
export default async function ConflictsPage() {
  const actor = await requireSystemAdminPage("/system/conflicts");
  const { conflicts, total } = await listConflicts({ actor, includeStale: false });
  return <ConflictQueuePanel initialConflicts={conflicts} initialTotal={total} />;
}
