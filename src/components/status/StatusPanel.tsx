import { SystemStatusDashboard } from "@/components/status/system-status-dashboard";
import type { CapabilityStatus } from "@/lib/system/capabilities";

type StatusPanelProps = {
  status: CapabilityStatus;
};

/** @deprecated Prefer SystemStatusDashboard */
export function StatusPanel({ status }: StatusPanelProps) {
  return <SystemStatusDashboard status={status} />;
}
