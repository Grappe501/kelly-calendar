import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";

type Props = {
  intelligence: MissionHomeViewModel["intelligence"];
};

export function MissionIntelligencePanel({ intelligence }: Props) {
  if (!intelligence.hasAny) {
    return (
      <p className="muted">No mission intelligence has been added yet.</p>
    );
  }

  return (
    <div className="todays-mission-intel">
      {intelligence.sections.map((section) => (
        <div key={section.title} className="todays-mission-intel-section">
          <h3>{section.title}</h3>
          <ul>
            {section.items.map((item) => (
              <li key={`${section.title}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
