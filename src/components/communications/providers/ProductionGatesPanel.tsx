"use client";

import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type GatesView = {
  notices: string[];
  metrics: Array<{
    id: string;
    providerKey: string;
    metricKey: string;
    value: number;
    windowStart: string;
    windowEnd: string;
  }>;
  gates: {
    allowed: boolean;
    blockReason: string | null;
    hardBlocked: boolean;
    gates: Record<string, boolean>;
  };
  failureRecoveryGuidance: string[];
};

export function ProductionGatesPanel({ initial }: { initial: GatesView }) {
  const gateFlags = initial.gates.gates ?? {};
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D22</p>
        <h1>Production Safety Gates & Metrics</h1>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={initial.notices} />

      <section className="briefing-section">
        <h2>Gates</h2>
        <p className="muted">
          {initial.gates.blockReason ?? "All gates open (unexpected in D22)"}
        </p>
        <ul className="briefing-fact-list">
          {Object.entries(gateFlags).map(([k, v]) => (
            <li key={k}>
              {k}: {v ? "true" : "false"}
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Failure recovery</h2>
        <ul className="briefing-fact-list">
          {initial.failureRecoveryGuidance.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Metrics</h2>
        <ul className="briefing-fact-list">
          {initial.metrics.length === 0 ? (
            <li>No samples yet.</li>
          ) : (
            initial.metrics.map((m) => (
              <li key={m.id}>
                {m.providerKey} · {m.metricKey} = {m.value}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
