import type { Metadata } from "next";
import { FullEventForm } from "@/components/event-entry/full-event-form";

export const metadata: Metadata = {
  title: "Full event planning",
};

type Props = {
  searchParams?: Promise<{ draftId?: string }>;
};

export default async function FullAddPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Full planning</h1>
        <p>
          Objectives, program flow, packing, staffing, travel, communications, and visibility —
          all staged as a non-live draft.
        </p>
      </header>
      <FullEventForm draftId={params.draftId} />
    </div>
  );
}
