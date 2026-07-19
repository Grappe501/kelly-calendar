import {
  getGoogleIntegrationEnv,
  GOOGLE_ROUTES_API_URL,
} from "@/features/google-integration/config";
import { AppError } from "@/lib/security/safe-error";

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  providerRequestVersion: string;
};

export {
  isVirtualOnlyEvent,
  metersToMiles,
  ROUTE_TRUTH_TYPE_ESTIMATE,
} from "@/features/google-integration/routes-truth";

/**
 * Compute Routes (new Routes API). Server-side only.
 * Returns GOOGLE_ROUTE_ESTIMATE inputs — never claim actual path.
 */
export async function computeRouteEstimate(input: {
  originAddress: string;
  destinationAddress: string;
}): Promise<RouteEstimate> {
  const env = getGoogleIntegrationEnv();
  if (!env.mapsRoutesApiKey) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Google Routes API key is not configured.",
    });
  }
  if (!env.routesEnabled) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Google Routes is disabled (KCCC_GOOGLE_ROUTES_ENABLED=false).",
    });
  }

  const res = await fetch(GOOGLE_ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.mapsRoutesApiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { address: input.originAddress },
      destination: { address: input.destinationAddress },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      units: "METRIC",
    }),
  });

  if (!res.ok) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: "Google Routes API request failed.",
    });
  }

  const json = (await res.json()) as {
    routes?: Array<{ distanceMeters?: number; duration?: string }>;
  };
  const route = json.routes?.[0];
  if (!route?.distanceMeters || !route.duration) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: "Google Routes API returned no usable route.",
    });
  }
  const durationSeconds = parseDurationSeconds(route.duration);
  return {
    distanceMeters: route.distanceMeters,
    durationSeconds,
    providerRequestVersion: "routes.googleapis.com/directions/v2:computeRoutes",
  };
}

function parseDurationSeconds(duration: string): number {
  const m = /^(\d+)s$/.exec(duration);
  if (!m) return 0;
  return Number(m[1]);
}
