"use client";

type Props = {
  enabled: boolean;
  onEnabled: (value: boolean) => void;
};

export function CommunicationsPlanBuilder({ enabled, onEnabled }: Props) {
  return (
    <label className="check-inline">
      <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />{" "}
      Social / press promotion needed
    </label>
  );
}
