import Link from "next/link";

export function DispatchAdminNav() {
  return (
    <nav className="briefing-nav" aria-label="Dispatch administration">
      <Link href="/system/communications">Communications queue</Link>
      <Link href="/system/communications/providers">Providers</Link>
      <Link href="/system/communications/dispatch">Dispatch history</Link>
      <Link href="/system/communications/controls">Kill switches</Link>
      <Link href="/system/communications/webhooks">Webhooks</Link>
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
