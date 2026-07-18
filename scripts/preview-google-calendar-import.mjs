/**
 * Operator helper — does not fetch unless GOOGLE_ICAL_URL is set.
 * Never prints the full URL.
 */
console.log("Google Calendar import preview helper");
console.log("Historical floor: 2025-11-01");
console.log("This script does not write to PostgreSQL.");
if (!process.env.GOOGLE_ICAL_URL) {
  console.log("No GOOGLE_ICAL_URL present — exiting without fetch.");
  console.log("Use /import/google-calendar or POST /api/import/google-calendar/preview.");
  process.exit(0);
}
console.log("GOOGLE_ICAL_URL is set (value redacted). Prefer the operator UI for preview/stage.");
