# Google Integration Data Ownership

| Layer | Owner | Sync may overwrite? |
|-------|-------|---------------------|
| Google source fields (time, title, location, status, attendees metadata) | Google Calendar | Yes (source of truth for those fields) |
| Campaign classification | KCCC / human | **No** |
| County / district enrichment | KCCC geo process | **No** |
| Relationship / CRM links | CRM + KCCC | **No** |
| Outcomes / follow-ups | KCCC operators | **No** |
| Approvals / AI review status | KCCC | **No** |
| Estimated travel legs | Derived (`GOOGLE_ROUTE_ESTIMATE`) | Regenerable; not actual path |

Always separate: recorded fact · derived metric · AI observation · AI recommendation · human decision.

Aligned with Architecture 1.0, Never Fake, Historical Campaign Memory 1.0.
