import Link from "next/link";

export function DispatchAdminNav() {
  return (
    <nav className="briefing-nav" aria-label="Dispatch administration">
      <Link href="/system/communications">Communications queue</Link>
      <Link href="/system/communications/templates">Templates</Link>
      <Link href="/system/communications/briefs">Briefs</Link>
      <Link href="/system/communications/compositions">Compositions</Link>
      <Link href="/system/communications/audiences">Audiences</Link>
      <Link href="/system/communications/campaigns">Campaigns</Link>
      <Link href="/system/communications/live-tests">Live tests</Link>
      <Link href="/system/communications/recipients/conflicts">
        Recipient conflicts
      </Link>
      <Link href="/system/communications/providers">Providers</Link>
      <Link href="/system/communications/providers/health">Provider health</Link>
      <Link href="/system/communications/providers/sandbox">Sandbox console</Link>
      <Link href="/system/communications/providers/domains">Domains</Link>
      <Link href="/system/communications/providers/gates">Safety gates</Link>
      <Link href="/system/communications/dispatch">Dispatch history</Link>
      <Link href="/system/communications/controls">Kill switches</Link>
      <Link href="/system/communications/webhooks">Webhooks</Link>
      <Link href="/system/communications/providers/webhooks">Webhook inspector</Link>
      <Link href="/system/communications/policy">Policy</Link>
    </nav>
  );
}

function killSwitchLabel(on: boolean): string {
  return on ? "ON (blocking)" : "OFF (permitting)";
}

export function KillSwitchSummary({
  globalKillSwitch,
  emailKillSwitch,
  smsKillSwitch,
}: {
  globalKillSwitch: boolean;
  emailKillSwitch: boolean;
  smsKillSwitch: boolean;
}) {
  return (
    <ul className="briefing-fact-list">
      <li>Global kill switch: {killSwitchLabel(globalKillSwitch)}</li>
      <li>Email kill switch: {killSwitchLabel(emailKillSwitch)}</li>
      <li>SMS kill switch: {killSwitchLabel(smsKillSwitch)}</li>
    </ul>
  );
}

export const DISPATCH_OPERATOR_NOTICES = [
  "Provider acceptance is not delivery. Delivery is not engagement.",
  "Kill switches default ON (blocking). Re-enabling dispatch does not resume old batches.",
] as const;
