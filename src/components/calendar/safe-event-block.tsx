import { CalendarCategoryLabel } from "@/components/calendar/calendar-category-label";
import { ProtectedEventNotice } from "@/components/calendar/protected-event-notice";
import type { SafeCalendarEventView } from "@/lib/calendar-security/safe-event-view";

type Props = {
  event: SafeCalendarEventView;
  /** Demonstration only — never wire live candidate data here in Step 3 */
  showAccessNotice?: boolean;
};

function formatTimeRange(startsAt: string, endsAt: string, allDay: boolean): string {
  if (allDay) return "All day";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  };
  const formatter = new Intl.DateTimeFormat("en-US", opts);
  return `${formatter.format(start)}–${formatter.format(end)}`;
}

export function SafeEventBlock({ event, showAccessNotice = true }: Props) {
  const timeLabel = formatTimeRange(event.startsAt, event.endsAt, event.allDay);
  const interactive = event.canOpen;
  const className = [
    "safe-event-block",
    `safe-event-block--${event.visibilityLevel.toLowerCase()}`,
    interactive ? "safe-event-block--openable" : "safe-event-block--locked",
  ].join(" ");

  const ariaLabel = [
    event.calendarName,
    event.title,
    event.locationLabel,
    timeLabel,
    event.protectedFieldsOmitted ? "limited access" : null,
  ]
    .filter(Boolean)
    .join(". ");

  const body = (
    <>
      <CalendarCategoryLabel
        calendarName={event.calendarName}
        calendarType={event.calendarType}
      />
      <p className="safe-event-block__title">{event.title}</p>
      {event.locationLabel ? (
        <p className="safe-event-block__location">{event.locationLabel}</p>
      ) : null}
      <p className="safe-event-block__time">
        <time dateTime={event.startsAt}>{timeLabel}</time>
      </p>
      {showAccessNotice && event.protectedFieldsOmitted ? (
        <ProtectedEventNotice message={event.limitedAccessLabel} />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <article className={className} aria-label={ariaLabel}>
        <button type="button" className="safe-event-block__hit">
          {body}
        </button>
      </article>
    );
  }

  return (
    <article className={className} aria-label={ariaLabel}>
      <div className="safe-event-block__static" tabIndex={0}>
        {body}
      </div>
    </article>
  );
}
