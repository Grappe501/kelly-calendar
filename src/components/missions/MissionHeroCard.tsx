import Link from "next/link";
import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";

type Props = {
  mission: MissionHomeViewModel;
};

export function MissionHeroCard({ mission }: Props) {
  return (
    <article
      className="panel todays-mission-hero"
      aria-labelledby="primary-mission-title"
    >
      <p className="todays-mission-hero-eyebrow">
        <span>{mission.lifecyclePhaseLabel}</span>
        <span aria-hidden="true"> · </span>
        <span>{mission.operationalStatusLabel}</span>
        {mission.isDraft ? (
          <>
            <span aria-hidden="true"> · </span>
            <span>Draft</span>
          </>
        ) : null}
      </p>
      <h2 id="primary-mission-title" className="todays-mission-hero-title">
        {mission.title}
      </h2>
      <p className="todays-mission-hero-when">{mission.whenLabel}</p>
      <p className="todays-mission-hero-where">
        {mission.locationLabel ?? "Location unknown"}
      </p>
      {mission.objective ? (
        <p className="todays-mission-hero-objective">
          <strong>Objective.</strong> {mission.objective}
        </p>
      ) : (
        <p className="todays-mission-hero-objective muted">
          <strong>Objective.</strong> Not set yet — mission remains a valid draft.
        </p>
      )}
      <p className="todays-mission-hero-readiness" role="status">
        {mission.readiness.label}
      </p>
      <div className="todays-mission-hero-actions">
        <Link
          className="button todays-mission-primary-action"
          href={mission.primaryAction.href}
        >
          {mission.primaryAction.label}
        </Link>
        {mission.primaryAction.forthcomingNote ? (
          <p className="muted todays-mission-forthcoming">
            {mission.primaryAction.forthcomingNote}
          </p>
        ) : null}
        <Link className="button secondary" href={mission.detailHref}>
          Mission record
        </Link>
      </div>
    </article>
  );
}
