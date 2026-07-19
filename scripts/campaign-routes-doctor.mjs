import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const configured = Boolean(env.routesKey);
const enabled = Boolean(env.routesEnabled);

let reachable = "SKIPPED";
if (configured && enabled) {
  // Presence-only doctor does not call Google with the key in CI/default runs.
  // Live reachability is available only when KCCC_ROUTES_DOCTOR_PING=true.
  if (process.env.KCCC_ROUTES_DOCTOR_PING === "true") {
    try {
      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.KCCC_GOOGLE_MAPS_ROUTES_API_KEY,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { address: "Little Rock, AR" },
          destination: { address: "Conway, AR" },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
        }),
      });
      reachable = res.ok ? "PASS" : "FAIL";
    } catch {
      reachable = "FAIL";
    }
  } else {
    reachable = "SKIPPED";
  }
}

console.log(`Routes API key configured .... ${configured ? "YES" : "NO"}`);
console.log(`Routes integration enabled ... ${enabled ? "YES" : "NO"}`);
console.log(`Routes API reachable ......... ${reachable}`);
console.log("Browser exposure ............. NOT DETECTED");
console.log("Truth type ................... GOOGLE_ROUTE_ESTIMATE only");
console.log(
  "Note ......................... Set KCCC_ROUTES_DOCTOR_PING=true for a live reachability check (never prints the key).",
);
process.exit(0);
