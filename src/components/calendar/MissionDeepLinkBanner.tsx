import type { MissionFocusBanner } from "@/lib/calendar/mission-deep-link";

type Props = {
  banner: MissionFocusBanner;
};

/**
 * Honest status for `/calendar?event=` deep links (Open Mission / HL-039).
 */
export function MissionDeepLinkBanner({ banner }: Props) {
  if (banner.kind === "none") return null;

  if (banner.kind === "focused") {
    return (
      <section
        className="panel mission-deep-link-banner mission-deep-link-focused"
        aria-live="polite"
        data-testid="mission-deep-link-banner"
      >
        <h2 className="visually-hidden">Focused mission</h2>
        <p>
          Opened mission: <strong>{banner.title}</strong>
        </p>
        <p className="muted">
          Highlighted in the schedule for this date. Use calendar navigation to return to your
          prior view.
        </p>
      </section>
    );
  }

  return (
    <section
      className="panel mission-deep-link-banner mission-deep-link-status"
      role="status"
      aria-live="polite"
      data-testid="mission-deep-link-banner"
    >
      <h2 className="visually-hidden">Mission link status</h2>
      <p>{banner.message}</p>
    </section>
  );
}
