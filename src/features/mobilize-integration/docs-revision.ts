/**
 * Official Mobilize API documentation inspection record (D16).
 * Source: https://github.com/mobilizeamerica/api
 */
export const MOBILIZE_DOCS = {
  inspectionDate: "2026-07-20",
  repository: "https://github.com/mobilizeamerica/api",
  documentationRevision: "1025d0f8920f9484f4e68368c0f403c8b68a3e92",
  documentationRevisionShort: "1025d0f",
  documentationCommitDate: "2024-03-27T19:45:55Z",
  apiBaseUrl: "https://api.mobilize.us/v1",
  allowlistedHosts: ["api.mobilize.us", "staging-api.mobilize.us"] as const,
  authentication: "Bearer token over HTTPS (Authorization: Bearer API_KEY)",
  invalidCredentialsStatus: 403,
  rateLimitStatus: 429,
  rateLimitReadPerSecond: 15,
  rateLimitWritePerSecond: 5,
  rateLimitNote:
    "Mobilize notes limits may change at short notice — reverify during each integration pass.",
  pagination: {
    cursorParam: "cursor",
    pageParam: "page",
    perPageParam: "per_page",
    perPageDefault: 25,
    nextPreviousLinks: true,
    resultsLimitedToField: "results_limited_to",
  },
  endpointsUsed: [
    "GET /v1/organizations/:organization_id/promoted_organizations",
    "GET /v1/organizations/:organization_id/events",
    "GET /v1/organizations/:organization_id/events/:event_id",
    "GET /v1/organizations/:organization_id/events/deleted",
    "GET /v1/organizations/:organization_id/people",
    "GET /v1/organizations/:organization_id/attendances",
    "GET /v1/organizations/:organization_id/events/:event_id/attendances",
    "GET /v1/enums",
  ],
  writeEndpointsDocumentedNotEnabled: [
    "POST /v1/organizations/:organization_id/events",
    "PUT /v1/organizations/:organization_id/events/:event_id",
    "DELETE /v1/organizations/:organization_id/events/:event_id",
    "POST /v1/organizations/:organization_id/events/:event_id/attendances",
    "POST /v1/organizations/:organization_id/affiliations",
    "POST /v1/images",
  ],
  adapterVersion: "kccc-mobilize-adapter-d16.1",
} as const;

export const MOBILIZE_CAMPAIGN_SCOPE = "KELLY";
export const MOBILIZE_PROVIDER = "MOBILIZE" as const;
