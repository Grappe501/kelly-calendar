import type { Metadata } from "next";
import { QuickEventForm } from "@/components/event-entry/quick-event-form";

export const metadata: Metadata = {
  title: "Quick event entry",
};

export default function QuickAddPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Quick entry</h1>
        <p>Dropdowns, duration chips, and templates — optimized for phone speed.</p>
      </header>
      <QuickEventForm />
    </div>
  );
}
