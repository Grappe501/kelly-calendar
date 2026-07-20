/**
 * Historical Google Calendar import CLI.
 * Default: dry-run, no apply, no connection-metadata writes.
 *
 *   npm run google:calendar:import-history
 */
import { runGoogleCalendarImport } from "../src/features/google-integration/import-history";
import { getGoogleIntegrationEnv } from "../src/features/google-integration/config";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const fromArg = args.find((a) => a.startsWith("--from="))?.slice("--from=".length);
  const toArg = args.find((a) => a.startsWith("--to="))?.slice("--to=".length);

  const env = getGoogleIntegrationEnv();

  if (apply) {
    console.error("REFUSED: CLI --apply is disabled for this milestone.");
    console.error("Use the admin API with apply+confirm after dry-run review.");
    process.exit(1);
  }

  const report = await runGoogleCalendarImport({
    mode: "history",
    apply: false,
    fromIso: fromArg || env.historyStartIso,
    toIso: toArg,
    persistConnectionState: false,
    includeReviewRows: true,
  });

  console.log(`Google OAuth dry-run .......... ${report.skippedSafely ? "SKIPPED" : "RAN"}`);
  if (report.reason) console.log(`Reason ......................... ${report.reason}`);
  console.log(`Dry-run ....................... ${report.dryRun ? "YES" : "NO"}`);
  console.log(`From .......................... ${report.fromIso ?? env.historyStartIso}`);
  console.log(`To ............................ ${report.toIso ?? "present"}`);
  console.log(`Database mutations ............ ${report.databaseMutations}`);
  console.log(`Events discovered ............. ${report.eventsDiscovered}`);
  console.log(`Cancelled events .............. ${report.cancelledEvents}`);
  console.log(`Recurring instances ........... ${report.recurringInstances}`);
  console.log(`Private events ................ ${report.privateEvents}`);
  console.log(`Possible KCCC matches ......... ${report.possibleKcccMatches}`);
  console.log(`Possible duplicates ........... ${report.possibleDuplicates}`);
  console.log(`Unresolved records ............ ${report.unresolvedRecords}`);
  console.log(
    `Would create/update ............ ${report.recordsThatWouldBeCreatedOrUpdated}`,
  );
  if (report.reviewArtifactPath) {
    console.log(`Review artifact ............... ${report.reviewArtifactPath}`);
  }

  if (report.skippedSafely) {
    process.exit(2);
  }

  const sample = (report.reviewRows ?? [])
    .filter((r) => r.wouldChange || r.reconcileStatus !== "NO_MATCH")
    .slice(0, 15);
  if (sample.length) {
    console.log("\nSample review rows (capped):");
    for (const row of sample) {
      console.log(
        `- [${row.reconcileStatus}] ${row.status ?? "?"} | ${row.summary ?? "(no title)"} | wouldChange=${row.wouldChange}`,
      );
    }
  }
}

main().catch((err) => {
  console.error("FAIL: dry-run import crashed");
  console.error(err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
