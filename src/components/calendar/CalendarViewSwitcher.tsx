import Link from "next/link";

const VIEWS = [
  { id: "today", label: "Today", ready: true, href: (dateKey: string) => `/?date=${dateKey}` },
  { id: "day", label: "Day", ready: true, href: (dateKey: string) => `/calendar?view=day&date=${dateKey}` },
  { id: "week", label: "Week", ready: true, href: (dateKey: string) => `/calendar?view=week&date=${dateKey}` },
  { id: "month", label: "Month", ready: true, href: (dateKey: string) => `/calendar?view=month&date=${dateKey}` },
  { id: "agenda", label: "Agenda", ready: true, href: (dateKey: string) => `/calendar?view=agenda&date=${dateKey}` },
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
        const href = view.href(dateKey);
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
