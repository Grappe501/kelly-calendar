# Calendar Search & Filter Doctrine (CC-07)

```text
Deterministic · permission-first · read-only · campaign-local dates
```

1. **One contract** — server-validated, versioned, stably serialized.
2. **Visibility before discovery** — no confidential existence leaks via results, counts, facets, or match explanations.
3. **Exact/prefix before includes** — no unexplained fuzzy matching.
4. **Filters are visible and removable** — clear-one / clear-all alter view state only.
5. **CC-05 / CC-06 are inputs** — ordinary filtering creates no new evaluations or conflict records.
6. **Multi-day Events count once** in unique totals.
7. **Relative Today stays relative** when saved.
8. **Saved views store queries, not result snapshots.**
9. **Shared views never grant Event access.**
10. **No Phase Two / RedDirt / Mobilize / push / AI features** in this doctrine.
