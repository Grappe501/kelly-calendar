import { CapabilityStatusCard } from "@/components/security/capability-status-card";

type EnvironmentReadinessCardProps = {
  appName: string;
  timezone: string;
  electionDate: string;
  appUrl?: string;
  database: string;
  directDatabase: string;
  supabaseBrowser: string;
  supabaseServer: string;
  openAi: string;
  redDirtFallbackEnabled: boolean;
  redDirtFallbackUsed: boolean;
};

export function EnvironmentReadinessCard(props: EnvironmentReadinessCardProps) {
  return (
    <CapabilityStatusCard
      title="Environment readiness"
      rows={[
        { label: "Application name", value: props.appName },
        { label: "Campaign timezone", value: props.timezone },
        { label: "Election date", value: props.electionDate },
        { label: "Application URL", value: props.appUrl ?? "Not set" },
        { label: "Database", value: props.database },
        { label: "Direct database URL", value: props.directDatabase },
        { label: "Supabase browser", value: props.supabaseBrowser },
        { label: "Supabase server", value: props.supabaseServer },
        { label: "OpenAI", value: `${props.openAi} (disabled)` },
        {
          label: "RedDirt fallback",
          value: props.redDirtFallbackEnabled
            ? props.redDirtFallbackUsed
              ? "Enabled · used"
              : "Enabled · unused"
            : "Disabled",
        },
      ]}
    />
  );
}
