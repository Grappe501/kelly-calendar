import type { Metadata } from "next";
import Link from "next/link";
import { EnvironmentReadinessCard } from "@/components/security/environment-readiness-card";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { getEnvironmentCapabilityStatus } from "@/lib/env/environment-status";

export const metadata: Metadata = {
  title: "Environment",
};

export const dynamic = "force-dynamic";

export default function EnvironmentPage() {
  const env = getEnvironmentCapabilityStatus();
  const availability = getStandingAvailabilityPolicy();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Environment readiness</h1>
        <p>Safe configuration status — secret values are never shown.</p>
      </header>

      <EnvironmentReadinessCard
        appName={env.publicSafe.appName}
        timezone={env.publicSafe.timezone}
        electionDate={env.publicSafe.electionDate}
        appUrl={env.publicSafe.appUrl}
        database={env.database}
        directDatabase={env.directDatabase}
        supabaseBrowser={env.supabaseBrowser}
        supabaseServer={env.supabaseServer}
        openAi={env.openAi}
        redDirtFallbackEnabled={env.redDirtFallback.enabled}
        redDirtFallbackUsed={env.redDirtFallback.used}
      />

      <section className="panel">
        <h2>Standing availability policy</h2>
        <p className="muted">
          Weekday office hours block time in the background. They are not listed as
          calendar events and are not included in event counts.
        </p>
        <ul>
          {availability.rules.map((rule) => (
            <li key={rule.id}>
              <strong>{rule.summary}</strong>
              {rule.overrideAllowed ? " · override capable" : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
          <Link className="button secondary" href="/system/security">
            Security status
          </Link>
        </div>
      </section>
    </div>
  );
}
