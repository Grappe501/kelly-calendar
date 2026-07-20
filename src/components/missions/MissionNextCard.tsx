import Link from "next/link";
import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";

type Props = {
  mission: MissionHomeViewModel;
};

export function MissionNextCard({ mission }: Props) {
  return (
    <article className="todays-mission-next-card">
      <p className="muted">
        {mission.lifecyclePhaseLabel} · {mission.operationalStatusLabel}
      </p>
      <h3 className="todays-mission-next-title">
        <Link href={mission.detailHref}>{mission.title}</Link>
      </h3>
      <p>{mission.whenLabel}</p>
      <p className="muted">{mission.locationLabel ?? "Location unknown"}</p>
      <Link className="button secondary" href={mission.detailHref}>
        Open mission details
      </Link>
    </article>
  );
}
