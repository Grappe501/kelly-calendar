"use client";

import { useEffect, useState } from "react";

type Props = {
  generatedAt: string;
  staleWarningMinutes: number;
};

export function BriefingPrintButton() {
  return (
    <button
      type="button"
      className="button secondary no-print"
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}

export function BriefingStaleNotice({
  generatedAt,
  staleWarningMinutes,
}: Props) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const generated = Date.parse(generatedAt);
    const check = () => {
      setStale((Date.now() - generated) / 60_000 > staleWarningMinutes);
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [generatedAt, staleWarningMinutes]);

  if (!stale) return null;
  return (
    <p className="briefing-disclaimer no-print" role="status">
      This briefing may be out of date. Refresh before relying on current Mission
      status.
    </p>
  );
}
