import Link from "next/link";

const VIEWS = [
  { id: "day", label: "Day", ready: true },
  { id: "week", label: "Week", ready: true },
  { id: "month", label: "Month", ready: true },
  { id: "agenda", label: "Agenda", ready: false },
  { id: "timeline", label: "Timeline", ready: false },
  { id: "mission", label: "Mission", ready: false },
] as const;

export type CalendarViewId = (typeof VIEWS)[number]["id"];

type Props = {
  active: CalendarViewId;
  dateKey: string;
};

export function CalendarViewSwitcher({ active, dateKey }: Props) {
  return (
    <nav className="view-chips calendar-view-switcher" aria-label="Calendar views">
      {VIEWS.map((view) => {
        if (!view.ready) {
          return (
            <span key={view.id} className="chip" aria-disabled="true">
              {view.label} · next
            </span>
          );
        }
        const href = `/calendar?view=${view.id}&date=${dateKey}`;
        const isActive = active === view.id;
        return (
          <Link
            key={view.id}
            href={href}
            className={`chip chip-link${isActive ? " chip-link-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
