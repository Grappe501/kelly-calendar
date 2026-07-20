import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";

type Props = {
  mission: MissionHomeViewModel;
};

export function MissionSuccessBlock({ mission }: Props) {
  return (
    <section className="panel" aria-labelledby="success-heading">
      <h2 id="success-heading">Success definition</h2>
      <div className="todays-mission-success">
        <h3>Objective</h3>
        {mission.objective ? (
          <p>{mission.objective}</p>
        ) : (
          <p className="muted">Missing — mark as draft until an objective is set.</p>
        )}
        <h3>Success looks like</h3>
        {mission.successCriteria.length > 0 ? (
          <ul>
            {mission.successCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            No success criteria are stored on this mission yet. Nothing invented.
          </p>
        )}
      </div>
    </section>
  );
}
