"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CampaignBriefRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button secondary brief-refresh"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Refresh brief"}
    </button>
  );
}
