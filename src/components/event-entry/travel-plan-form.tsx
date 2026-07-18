"use client";

type Props = {
  candidateTravelRequired: boolean;
  overnightStay: boolean;
  onChange: (next: { candidateTravelRequired: boolean; overnightStay: boolean }) => void;
};

export function TravelPlanForm({
  candidateTravelRequired,
  overnightStay,
  onChange,
}: Props) {
  return (
    <div className="checkbox-grid">
      <label className="check-inline">
        <input
          type="checkbox"
          checked={candidateTravelRequired}
          onChange={(e) =>
            onChange({ candidateTravelRequired: e.target.checked, overnightStay })
          }
        />{" "}
        Candidate travel required
      </label>
      <label className="check-inline">
        <input
          type="checkbox"
          checked={overnightStay}
          onChange={(e) =>
            onChange({ candidateTravelRequired, overnightStay: e.target.checked })
          }
        />{" "}
        Overnight stay
      </label>
    </div>
  );
}
