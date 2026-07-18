"use client";

import { EVENT_PRESETS } from "@/features/event-drafts/event-presets";

type Props = {
  onSelect: (presetId: string) => void;
};

export function EventTemplatePicker({ onSelect }: Props) {
  return (
    <div className="template-grid" role="list">
      {EVENT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="button secondary template-chip"
          role="listitem"
          onClick={() => onSelect(preset.id)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
