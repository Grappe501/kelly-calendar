import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const apply = process.argv.includes("--apply");

if (!env.routesKey || !env.routesEnabled) {
  console.log(
    JSON.stringify(
      {
        routesApi: "NOT CONFIGURED",
        routeReconstruction: "SKIPPED SAFELY",
        truthType: "GOOGLE_ROUTE_ESTIMATE",
        dryRun: !apply,
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
      routesApi: "CONFIGURED",
      routeReconstruction: apply
        ? "APPLY_VIA_ADMIN_OR_API"
        : "DRY_RUN_READY",
      truthType: "GOOGLE_ROUTE_ESTIMATE",
      dryRun: !apply,
      language: "Estimated campaign route — not actual miles driven",
      endpoint: "POST /api/integrations/google/routes/reconstruct",
    },
    null,
    2,
  ),
);
process.exit(0);
