import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOperationsBoard } from "@/server/services/mission-activation-service";

export const dynamic = "force-dynamic";

type Board =
  | "events"
  | "communications"
  | "volunteers"
  | "logistics"
  | "field"
  | "tasks"
  | "notifications";

const TITLES: Record<Board, string> = {
  events: "Events Management board",
  communications: "Communications Manager",
  volunteers: "Volunteer Manager Command Center",
  logistics: "Logistics calendar & board",
  field: "Field operations board",
  tasks: "Activation tasks",
  notifications: "Internal notifications",
};

export function makeBoardPage(board: Board, titleExtra?: string) {
  return async function BoardPage() {
    const actor = await requireActiveAuthenticatedActor();
    const data = await getOperationsBoard(actor, board);
    return (
      <div className="page-stack">
        <CampaignOpsSuperHeader
          title={TITLES[board]}
          principle="Clear guidance and reliable systems for all 75 counties"
        />
        {titleExtra ? <p className="muted">{titleExtra}</p> : null}
        {"d20Coordination" in data && data.d20Coordination ? (
          <p>
            <Link href={data.d20Coordination.href}>
              {data.d20Coordination.note}
            </Link>
          </p>
        ) : null}
        {"logisticsReuse" in data && data.logisticsReuse ? (
          <p className="button-row">
            <Link href={data.logisticsReuse.travelHref}>Day Movement</Link>
            <Link href={data.logisticsReuse.logisticsHref}>Day Logistics</Link>
            <Link href={data.logisticsReuse.fieldOpsHref}>Day Field Ops</Link>
          </p>
        ) : null}
        {"needs" in data ? (
          <section className="panel">
            <h2>Open volunteer needs</h2>
            <p className="muted">{(data as { note?: string }).note}</p>
            <ul>
              {(data.needs as Array<Record<string, unknown>>).map((n) => (
                <li key={String(n.id)}>
                  {String(n.role)} · {String(n.status)} · Mission{" "}
                  <Link href={`/system/missions/${String(n.missionId)}/activation`}>
                    open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {"items" in data ? (
          <section className="panel">
            <h2>Inbox</h2>
            <p className="muted">
              Push delivery not claimed (IC-11 later). Deep-links only.
            </p>
            <ul>
              {(data.items as Array<Record<string, unknown>>).map((n) => (
                <li key={String(n.id)}>
                  <Link href={String(n.deepLink)}>{String(n.title)}</Link>
                  {n.body ? ` — ${String(n.body)}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {"tasks" in data ? (
          <section className="panel">
            <h2>Tasks ({(data.tasks as unknown[]).length})</h2>
            <ul>
              {(data.tasks as Array<Record<string, unknown>>).map((t) => (
                <li key={String(t.id)}>
                  <strong>{String(t.department)}</strong> · {String(t.title)} ·{" "}
                  {String(t.status)}
                  {t.dueAt
                    ? ` · ${new Date(String(t.dueAt)).toLocaleString()}`
                    : ""}
                  {" · "}
                  <Link
                    href={`/system/missions/${String(t.missionId)}/activation`}
                  >
                    Mission activation
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <Link className="button secondary" href="/system/operations">
          Ops hub
        </Link>
      </div>
    );
  };
}

export const metadata: Metadata = { title: "Operations board" };
