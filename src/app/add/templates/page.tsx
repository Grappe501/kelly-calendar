"use client";

import { useRouter } from "next/navigation";
import { EventTemplatePicker } from "@/components/event-entry/event-template-picker";
import { DraftStatusBanner } from "@/components/event-entry/draft-status-banner";

export default function TemplatesPage() {
  const router = useRouter();
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Event templates</h1>
        <p>Presets prefill calendar, duration, packing, and checklists. Everything stays editable.</p>
      </header>
      <DraftStatusBanner />
      <section className="panel">
        <EventTemplatePicker
          onSelect={(id) => {
            router.push(`/add/quick?template=${id}`);
          }}
        />
      </section>
    </div>
  );
}
