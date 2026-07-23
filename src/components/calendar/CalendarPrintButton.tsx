"use client";

export function CalendarPrintButton() {
  return (
    <button
      type="button"
      className="button primary no-print touch-target"
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}
