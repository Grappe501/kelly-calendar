import { loadGoogleEnv, printConfigured } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
printConfigured("Routes API Key", env.routesKey);
console.log(`Routes enabled ............... ${env.routesEnabled ? "yes" : "no"}`);
console.log(
  `Routes API ................... ${
    env.routesKey && env.routesEnabled ? "CONFIGURED" : "NOT CONFIGURED"
  }`,
);
console.log("Key browser-exposed .......... no (server env only)");
console.log("Truth type ................... GOOGLE_ROUTE_ESTIMATE only");
process.exit(0);
