import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
console.log(
  JSON.stringify(
    {
      truthType: "GOOGLE_ROUTE_ESTIMATE",
      language: "Estimated campaign route distance (not actual miles driven)",
      historyStart: env.historyStart,
      routesConfigured: Boolean(env.routesKey),
      note: "Full report available after reconstruction via admin panel / CampaignTravelLeg records.",
      excluded: ["virtual-only meetings", "cancelled events", "unresolved locations"],
      blockedFuture: "KCCC-GOOGLE-TIMELINE-IMPORT-1.0 (actual driven tracks)",
    },
    null,
    2,
  ),
);
process.exit(0);
