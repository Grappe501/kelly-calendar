import Link from "next/link";

type Props = {
  dateKey: string;
  view?: "day" | "week" | "agenda";
  className?: string;
};

/**
 * CC-12 Print chip — opens privacy-aware preview (date + view only in URL).
 */
export function CalendarPrintLink({
  dateKey,
  view = "day",
  className,
}: Props) {
  const params = new URLSearchParams();
  params.set("date", dateKey);
  params.set("view", view);
  return (
    <Link
      href={`/system/calendar/print/preview?${params.toString()}`}
      className={className ?? "chip chip-link touch-target"}
    >
      Print
    </Link>
  );
}
