import Link from "next/link";

export default function CloseoutNotFound() {
  return (
    <div className="page-stack">
      <h1>Closeout date not found</h1>
      <p className="muted">
        Use a valid YYYY-MM-DD date within today through the previous 14 days.
        Future dates cannot be closed out.
      </p>
      <Link className="button" href="/system/briefing/closeout">
        Open today’s closeout
      </Link>
    </div>
  );
}
