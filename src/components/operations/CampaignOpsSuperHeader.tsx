import Link from "next/link";

type Props = {
  title: string;
  principle?: string;
};

/** Restrained campaign super header for Command Center & ops workspaces. */
export function CampaignOpsSuperHeader({ title, principle }: Props) {
  const nowLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  return (
    <header className="campaign-ops-superheader page-header" role="banner">
      <div className="campaign-ops-superheader-brand">
        <p className="eyebrow">Kelly Grappe for Secretary of State</p>
        <h1>{title}</h1>
        {principle ? <p className="campaign-ops-principle">{principle}</p> : null}
      </div>
      <div className="campaign-ops-superheader-meta">
        <p>
          <span className="muted">Campaign local · </span>
          {nowLabel}
        </p>
        <nav className="button-row" aria-label="Operations quick links">
          <Link className="chip chip-link touch-target" href="/system/operations">
            Ops hub
          </Link>
          <Link className="chip chip-link touch-target" href="/">
            Today
          </Link>
          <Link className="chip chip-link touch-target" href="/system/missions/command-center">
            Command Center
          </Link>
        </nav>
      </div>
    </header>
  );
}
