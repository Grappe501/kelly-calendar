"use client";

import { FormEvent, useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      "Indexed calendar search is not connected yet. Search will activate after events exist in the database.",
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Search</h1>
        <p>Search module shell — no AI queries in Step 2.</p>
      </header>

      <section className="panel" aria-labelledby="search-heading">
        <h2 id="search-heading">Find schedule items</h2>
        <form className="search-form" onSubmit={onSubmit}>
          <label htmlFor="calendar-search">Search query</label>
          <input
            id="calendar-search"
            name="q"
            type="search"
            placeholder="Heber Springs, Chris, county dinners…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <button className="button" type="submit">
            Search (placeholder)
          </button>
        </form>
        {notice ? (
          <p className="muted" role="status" style={{ marginTop: "1rem" }}>
            {notice}
          </p>
        ) : (
          <p className="muted" style={{ marginTop: "1rem" }}>
            Natural-language and keyword search arrive after the data foundation and search index
            are in place.
          </p>
        )}
      </section>
    </div>
  );
}
