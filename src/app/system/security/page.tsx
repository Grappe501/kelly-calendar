import type { Metadata } from "next";
import Link from "next/link";
import { CapabilityStatusCard } from "@/components/security/capability-status-card";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";

export const metadata: Metadata = {
  title: "Security",
};

export default function SecurityPage() {
  const security = getSecurityCapabilityStatus();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Security status</h1>
        <p>
          Step 3 security foundation — not full production certification for candidate data.
        </p>
      </header>

      <CapabilityStatusCard
        title="Controls"
        rows={[
          { label: "Security headers", value: security.headers ? "Active" : "Missing" },
          { label: "CSP", value: "Staged / Active" },
          { label: "Client secret isolation", value: "Active" },
          { label: "Safe error handling", value: "Active" },
          { label: "Request IDs", value: "Active" },
          { label: "Logging redaction", value: "Active" },
          { label: "Cookie policy foundation", value: "Active" },
          { label: "Origin-check foundation", value: "Active" },
          {
            label: "Rate-limit foundation",
            value: "Partial (in-memory · not distributed)",
          },
          { label: "Authentication", value: "Not complete" },
          { label: "Database mutation", value: "Not authorized" },
          { label: "Production data readiness", value: "No" },
        ]}
      />

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/api/system/security">
            Security JSON
          </Link>
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
        </div>
      </section>
    </div>
  );
}
