"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Team = {
  organizationInstalled: boolean;
  activationPlanId: string | null;
  vacantCriticalPositions: string[];
  lanes: Array<{ name: string; staffingBlocker: string }>;
  createdTasks: number;
};

export function MissionOperatingTeamPanel({ missionId }: { missionId: string }) {
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/missions/${missionId}/operating-team`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setTeam(data as Team);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  return (
    <section className="panel" aria-labelledby="operating-team-heading">
      <h2 id="operating-team-heading">Operating Team</h2>
      {!team ? (
        <p className="muted">Loading organization posture…</p>
      ) : (
        <>
          <p>
            Organization template:{" "}
            <strong>{team.organizationInstalled ? "installed" : "not installed"}</strong>
            {" · "}
            Tasks created by this panel: {team.createdTasks}
          </p>
          {team.activationPlanId ? (
            <p>
              Active activation plan linked.{" "}
              <Link href={`/system/missions/${missionId}/activation`}>Open activation</Link>
            </p>
          ) : null}
          {team.vacantCriticalPositions.length > 0 ? (
            <div>
              <h3>Staffing gaps</h3>
              <ul>
                {team.vacantCriticalPositions.map((t) => (
                  <li key={t}>{t} — vacant (no silent reassignment)</li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul>
            {team.lanes.slice(0, 8).map((l) => (
              <li key={l.name}>
                <strong>{l.name}</strong> · {l.staffingBlocker}
              </li>
            ))}
          </ul>
          <Link href="/system/organization">Organization scaffold</Link>
        </>
      )}
    </section>
  );
}
