import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";

type Props = {
  readiness: MissionHomeViewModel["readiness"];
};

export function MissionReadinessList({ readiness }: Props) {
  return (
    <div className="todays-mission-readiness">
      <p
        className={`todays-mission-readiness-state todays-mission-readiness-state--${readiness.state.toLowerCase()}`}
        role="status"
      >
        <span className="todays-mission-readiness-badge" aria-hidden="true">
          {readiness.state === "READY"
            ? "●"
            : readiness.state === "NEEDS_ATTENTION"
              ? "▲"
              : "○"}
        </span>
        {readiness.label}
      </p>
      <ul className="todays-mission-check-list">
        {readiness.checks.map((check) => (
          <li key={check.id}>
            <span aria-hidden="true">{check.ok ? "✓" : "–"}</span>{" "}
            <span>
              {check.label}
              <span className="visually-hidden">
                {check.ok ? " — available" : " — missing"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
