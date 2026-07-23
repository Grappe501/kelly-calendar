import Link from "next/link";

type Props = {
  dateKey: string;
  className?: string;
};

/**
 * CC-12 — Agenda list view for narrow screens / list-preferring operators.
 * Day and Week toolbars surface this so dense grids are not the only path.
 */
export function MobileAgendaFallbackLink({ dateKey, className }: Props) {
  return (
    <Link
      className={className ?? "chip chip-link touch-target mobile-agenda-fallback"}
      href={`/calendar?view=agenda&date=${dateKey}`}
      aria-label="Agenda list view"
    >
      Agenda list view
    </Link>
  );
}
