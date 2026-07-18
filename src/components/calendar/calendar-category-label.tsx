type Props = {
  calendarName: string;
  calendarType?: string;
};

export function CalendarCategoryLabel({ calendarName, calendarType }: Props) {
  return (
    <p className="calendar-category-label" data-calendar-type={calendarType}>
      {calendarName}
    </p>
  );
}
