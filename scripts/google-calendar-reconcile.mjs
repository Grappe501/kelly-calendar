import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
if (!(env.clientId && env.encryptionKey)) {
  console.log(
    JSON.stringify(
      {
        googleOAuth: "NOT CONFIGURED",
        reconcile: "SKIPPED SAFELY",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      googleOAuth: "CONFIGURED",
      reconcile: "READY",
      statuses: [
        "AUTO_MATCH_HIGH_CONFIDENCE",
        "REVIEW_POSSIBLE_MATCH",
        "NO_MATCH",
        "SOURCE_CONFLICT",
      ],
      note: "Reconciliation runs during import/sync; review queue is googleReconcileStatus on CalendarImportRecord.",
    },
    null,
    2,
  ),
);
process.exit(0);
