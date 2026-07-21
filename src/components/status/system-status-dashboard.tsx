import { CapabilityStatusCard } from "@/components/security/capability-status-card";
import type { CapabilityStatus } from "@/lib/system/capabilities";

type SystemStatusDashboardProps = {
  status: CapabilityStatus;
};

export function SystemStatusDashboard({ status }: SystemStatusDashboardProps) {
  const authComplete = status.security.authenticationComplete;
  const candidateReady = status.security.candidateDataReady;

  return (
    <div className="page-stack">
      <CapabilityStatusCard
        title="Calendar status"
        rows={[
          {
            label: "Primary status",
            value: candidateReady
              ? "Secure calendar foundation certified — Step 9 next"
              : "Calendar foundation in progress",
          },
          {
            label: "Authentication",
            value: authComplete ? "Complete" : "Incomplete",
          },
          {
            label: "Real candidate data",
            value: candidateReady ? "Permitted for authorized roles" : "Prohibited",
          },
          {
            label: "Step 8 closeout",
            value: status.application.step8CloseoutStatus,
          },
          {
            label: "Step 9 canonical Event",
            value: status.application.step9CanonicalEventStatus,
          },
          {
            label: "Current build focus",
            value: status.application.primaryFocus,
          },
          {
            label: "Next authorized build",
            value: status.application.nextAuthorizedBuild,
          },
          {
            label: "Communications subsystem",
            value: `${status.application.communicationsTrack} — not production-enabled`,
          },
          {
            label: "LG-1 controlled live test",
            value: status.application.lg1Status,
          },
        ]}
      />
      <CapabilityStatusCard
        title="Application"
        rows={[
          { label: "Ready", value: status.application.ready ? "Yes" : "No" },
          {
            label: "Current step",
            value: `${status.application.step} of ${status.application.totalSteps}`,
          },
          { label: "Step ID", value: status.application.stepId },
          { label: "Environment", value: status.application.environment },
          {
            label: "Commit",
            value: status.application.commitRef ?? "local / unavailable",
          },
          {
            label: "Recovery build",
            value: status.application.recoveryBuildId,
          },
        ]}
      />
      <CapabilityStatusCard
        title="Environment"
        rows={[
          {
            label: "Public configuration",
            value: status.environment.publicConfigurationValid ? "Valid" : "Invalid",
          },
          { label: "Database", value: status.environment.database },
          { label: "Direct database", value: status.environment.directDatabase },
          { label: "Supabase browser", value: status.environment.supabaseBrowser },
          { label: "Supabase server", value: status.environment.supabaseServer },
          { label: "OpenAI", value: status.environment.openAi },
          {
            label: "RedDirt fallback",
            value: status.environment.redDirtFallbackEnabled
              ? status.environment.redDirtFallbackUsed
                ? "Enabled · used"
                : "Enabled"
              : "Disabled",
          },
        ]}
      />
      <CapabilityStatusCard
        title="Database"
        rows={[
          { label: "Configured", value: status.database.configured ? "Yes" : "No" },
          {
            label: "Connection tested",
            value: status.database.tested ? "Yes" : "No",
          },
          {
            label: "Connection succeeded",
            value:
              status.database.succeeded === undefined
                ? "Not tested in this view"
                : status.database.succeeded
                  ? "Yes"
                  : "No",
          },
          { label: "Target class", value: status.database.targetClass },
          {
            label: "Mutations (auth-gated)",
            value: status.security.databaseMutationsAuthorized ? "Authorized when signed in" : "Blocked",
          },
        ]}
      />
      <CapabilityStatusCard
        title="Authentication"
        rows={[
          {
            label: "Public config present",
            value: status.authentication.publicConfigurationPresent ? "Yes" : "No",
          },
          {
            label: "Service config present",
            value: status.authentication.serviceConfigurationPresent ? "Yes" : "No",
          },
          {
            label: "Enabled",
            value: status.authentication.enabled ? "Yes" : "No",
          },
          {
            label: "Authentication complete",
            value: authComplete ? "true" : "false",
          },
        ]}
      />
      <CapabilityStatusCard
        title="AI"
        rows={[
          { label: "Key configured", value: status.ai.configured ? "Yes" : "No" },
          { label: "Enabled", value: "false" },
          { label: "Authority", value: status.ai.authority },
          { label: "Planned step", value: "16" },
        ]}
      />
      <CapabilityStatusCard
        title="Security"
        rows={[
          { label: "Security headers", value: "Active" },
          { label: "CSP", value: "Staged" },
          { label: "Error sanitization", value: "Active" },
          { label: "Structured logging", value: "Active" },
          {
            label: "Rate-limit foundation",
            value: "Active (in-memory · not distributed)",
          },
          {
            label: "Authentication complete",
            value: authComplete ? "true" : "false",
          },
          {
            label: "Candidate-data ready",
            value: candidateReady ? "true" : "false",
          },
          {
            label: "Certification build",
            value: status.security.candidateDataCertificationBuildId,
          },
        ]}
      />
      <CapabilityStatusCard
        title="Standing campaign availability"
        rows={status.campaignAvailability.rules.map((rule) => ({
          label: rule.id,
          value: rule.summary,
        }))}
      />
      <section className="panel">
        <h2>Warnings</h2>
        <ul>
          {status.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
