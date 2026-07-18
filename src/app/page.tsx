import { TodayCommandPanels } from "@/components/today/TodayCommandPanels";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { formatCampaignDate, getElectionCountdown } from "@/lib/dates/election";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getTodayCommandShellData } from "@/server/services/command-summary-today";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const config = getPublicAppConfig();
  const countdown = getElectionCountdown();
  const todayLabel = formatCampaignDate();
  const availability = getStandingAvailabilityPolicy();
  const actor = await requireActiveAuthenticatedActor();
  const data = await getTodayCommandShellData(actor);

  return (
    <div className="page-stack">
      <TodayCommandPanels
        data={data}
        todayLabel={todayLabel}
        countdownLabel={countdown.label}
        appName={config.appName}
        nested
      />
      <section className="panel" aria-labelledby="availability-heading">
        <h2 id="availability-heading">Standing availability</h2>
        <ul>
          {availability.rules.slice(0, 2).map((rule) => (
            <li key={rule.id}>{rule.summary}</li>
          ))}
        </ul>
        <p className="muted">
          Vacation and explicit releases can override work blocks through the Command
          Calendar.
        </p>
      </section>
    </div>
  );
}
