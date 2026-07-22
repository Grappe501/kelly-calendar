import { Suspense } from "react";
import { CalendarSearchChrome } from "@/components/calendar/search/CalendarSearchChrome";

type Props = {
  compact?: boolean;
  resultCount?: number | null;
  truncated?: boolean;
};

/** Suspense boundary for useSearchParams in App Router. */
export function CalendarSearchChromeHost(props: Props) {
  return (
    <Suspense fallback={<div className="muted">Loading search…</div>}>
      <CalendarSearchChrome {...props} />
    </Suspense>
  );
}
