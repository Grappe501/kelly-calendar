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
          {security.candidateDataReady
            ? "Step 8 closeout certified — authentication and candidate-data readiness are active for authorized roles."
            : "Security foundation active — candidate-data certification incomplete."}
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
          {
            label: "Authentication complete",
            value: security.authenticationComplete ? "Yes" : "No",
          },
          {
            label: "Database mutations",
            value: security.databaseMutationsAuthorized
              ? "Authorized when signed in"
              : "Not authorized",
          },
          {
            label: "Candidate-data ready",
            value: security.candidateDataReady ? "Yes" : "No",
          },
          {
            label: "Certification build",
            value: security.candidateDataCertificationBuildId,
          },
        ]}
      />

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
          <Link className="button secondary" href="/more">
            Back to More
          </Link>
        </div>
      </section>
    </div>
  );
}
