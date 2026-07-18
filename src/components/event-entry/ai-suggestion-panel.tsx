import { AI_ASSISTANCE_STATUS } from "@/features/event-drafts/planning-suggestions";

type Props = {
  open?: boolean;
};

export function AiSuggestionPanel({ open = true }: Props) {
  if (!open) return null;
  return (
    <section className="panel" aria-labelledby="ai-help-heading">
      <h2 id="ai-help-heading">Ask AI to help</h2>
      <p className="muted">
        AI assistance is prepared as an advisory contract only. It is{" "}
        <strong>disabled by default</strong> and cannot publish events, assign staff, send
        communications, or invent locations.
      </p>
      <ul className="status-list">
        <li>
          <span>AI enabled</span>
          <strong>{AI_ASSISTANCE_STATUS.aiEnabled ? "yes" : "no"}</strong>
        </li>
        <li>
          <span>Human approval required</span>
          <strong>always</strong>
        </li>
        <li>
          <span>Trusted patterns</span>
          <strong>reviewed history only</strong>
        </li>
      </ul>
      <p className="muted">
        When enabled later, suggestions will show field-by-field evidence. Unreviewed Google
        imports will never train recommendations.
      </p>
    </section>
  );
}
