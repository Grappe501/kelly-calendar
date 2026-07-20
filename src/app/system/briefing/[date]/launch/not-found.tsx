import Link from "next/link";

export default function LaunchNotFound() {
  return (
    <div className="page-stack">
      <h1>Launch date not found</h1>
      <p className="muted">
        Use a valid YYYY-MM-DD date within today through the previous 7 days.
        Future dates cannot be launched.
      </p>
      <Link className="button" href="/system/briefing/launch">
        Open today’s Launch Review
      </Link>
    </div>
  );
}
