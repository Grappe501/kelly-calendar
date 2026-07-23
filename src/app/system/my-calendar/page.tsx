import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = { title: "My Calendar" };
export const dynamic = "force-dynamic";

export default async function MyCalendarPage() {
  await requireActiveAuthenticatedActor();
  return (
    <div className="page-stack">
      <h1>My Calendar</h1>
      <p>
        Derived view of the canonical campaign calendar — Events are not copied into
        department tables. Open the shared calendar with role filters.
      </p>
      <div className="button-row">
        <Link className="button" href="/calendar">
          Open calendar
        </Link>
        <Link className="button secondary" href="/system/my-work">
          My Work
        </Link>
      </div>
    </div>
  );
}
