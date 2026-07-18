# Recommendation Decision Protocol

Routes under `/api/events/[eventId]/recommendations/[recommendationId]/`:

| Decision | Behavior |
| --- | --- |
| accept | Revalidate evidence, authorize, apply through ordinary mutation services, store decision, audit |
| reject | Store decision + optional reason; no canonical event change; suppress until evidence changes |
| modify | Validate operator alternative; apply via mutation service; preserve original recommendation |
| defer | Store future review condition; no event mutation |

All decisions require `RECOMMENDATION_DECIDE` and session-derived actors.
