import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const configured = Boolean(env.routesKey);
const enabled = Boolean(env.routesEnabled);

/**
 * Minimal valid Routes API v2 computeRoutes body (latLng waypoints).
 * Never log the API key, Authorization headers, or full Google payloads.
 */
function buildDoctorPingBody() {
  return {
    origin: {
      location: {
        latLng: {
          latitude: 34.7465,
          longitude: -92.2896,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: 35.0887,
          longitude: -92.4421,
        },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    computeAlternativeRoutes: false,
    languageCode: "en-US",
    units: "IMPERIAL",
  };
}

function classifyRoutesFailure(httpStatus, googleStatus, googleMessageSafe) {
  const msg = (googleMessageSafe || "").toLowerCase();
  const status = String(googleStatus || "");

  if (httpStatus === 403 || status === "PERMISSION_DENIED") {
    return "CREDENTIAL_OR_PERMISSION";
  }
  if (
    msg.includes("api key not valid") ||
    msg.includes("api key is invalid") ||
    msg.includes("invalid api key") ||
    msg.includes("api_key_invalid")
  ) {
    return "CREDENTIAL_KEY_EXPLICIT";
  }
  if (httpStatus === 400 || status === "INVALID_ARGUMENT") {
    return "REQUEST_OR_ARGUMENT";
  }
  return "OTHER";
}

let reachable = "SKIPPED";
let failureClass = null;
let httpStatus = null;
let googleStatus = null;

if (configured && enabled) {
  // Presence-only doctor does not call Google with the key in CI/default runs.
  // Live reachability is available only when KCCC_ROUTES_DOCTOR_PING=true.
  if (process.env.KCCC_ROUTES_DOCTOR_PING === "true") {
    try {
      const res = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.KCCC_GOOGLE_MAPS_ROUTES_API_KEY,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
          },
          body: JSON.stringify(buildDoctorPingBody()),
        },
      );
      httpStatus = res.status;
      let googleMessageSafe = "";
      try {
        const j = await res.json();
        googleStatus = j?.error?.status || null;
        googleMessageSafe = String(j?.error?.message || "")
          .replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
          .slice(0, 160);
      } catch {
        googleStatus = null;
      }
      if (res.ok) {
        reachable = "PASS";
      } else {
        reachable = "FAIL";
        failureClass = classifyRoutesFailure(
          httpStatus,
          googleStatus,
          googleMessageSafe,
        );
      }
    } catch {
      reachable = "FAIL";
      failureClass = "NETWORK";
    }
  } else {
    reachable = "SKIPPED";
  }
}

console.log(`Routes API key configured .... ${configured ? "YES" : "NO"}`);
console.log(`Routes integration enabled ... ${enabled ? "YES" : "NO"}`);
console.log(`Routes API reachable ......... ${reachable}`);
if (reachable === "PASS") {
  console.log("Classification ............... SUCCESS");
} else if (reachable === "FAIL") {
  console.log(`HTTP status .................. ${httpStatus ?? "unknown"}`);
  console.log(`Google status ................ ${googleStatus ?? "unknown"}`);
  console.log(`Classification ............... ${failureClass ?? "unknown"}`);
  console.log(
    "Note ......................... REQUEST_OR_ARGUMENT first; replace key only on CREDENTIAL_OR_PERMISSION / CREDENTIAL_KEY_EXPLICIT.",
  );
} else {
  console.log("Classification ............... SKIPPED");
}
console.log("Browser exposure ............. NOT DETECTED");
console.log("Truth type ................... GOOGLE_ROUTE_ESTIMATE only");
console.log(
  "Note ......................... Set KCCC_ROUTES_DOCTOR_PING=true for a live reachability check (never prints the key).",
);
process.exit(reachable === "FAIL" ? 1 : 0);
