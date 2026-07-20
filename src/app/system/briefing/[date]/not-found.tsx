import Link from "next/link";

export default function BriefingNotFound() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Briefing date not available</h1>
        <p className="muted">
          Use a valid date in YYYY-MM-DD format within the allowed briefing
          range.
        </p>
        <Link className="button" href="/system/briefing/today">
          Open Today’s Briefing
        </Link>
      </header>
    </div>
  );
}
