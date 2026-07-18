import type { CapabilityStatus } from "@/lib/system/capabilities";

type StatusPanelProps = {
  status: CapabilityStatus;
};

function label(value: boolean | string): string {
  if (typeof value === "boolean") return value ? "Ready / yes" : "Not enabled";
  return value;
}

export function StatusPanel({ status }: StatusPanelProps) {
  const rows = [
    { name: "Application", value: status.application.ready ? "Ready" : "Not ready" },
    {
      name: "Environment validation",
      value: status.environment.publicConfigReady ? "Partial" : "Missing",
    },
    {
      name: "Database connection",
      value: status.database.tested
        ? "Tested"
        : status.database.configured
          ? "Configured — not tested in this view"
          : "Not tested",
    },
    { name: "Authentication", value: label(status.authentication.enabled) },
    {
      name: "AI",
      value: status.ai.enabled
        ? "Enabled"
        : status.ai.configured
          ? "Configured — disabled"
          : "Not enabled",
    },
    {
      name: "Current step",
      value: `${status.application.step} of ${status.application.totalSteps}`,
    },
    { name: "Deployment provider", value: status.deployment.provider },
  ];

  return (
    <section className="panel" aria-labelledby="system-status-heading">
      <h2 id="system-status-heading">System status</h2>
      <ul className="status-list">
        {rows.map((row) => (
          <li key={row.name}>
            <span>{row.name}</span>
            <strong>{row.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
