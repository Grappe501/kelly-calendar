import "server-only";

import type { LocationDisclosure } from "@prisma/client";

export function resolveLocationDisclosure(input: {
  eventDisclosure: LocationDisclosure;
  viewerAccess: "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL";
  isProtectedPersonal: boolean;
}): LocationDisclosure {
  if (input.isProtectedPersonal || input.viewerAccess === "AVAILABILITY_ONLY") {
    return "HIDDEN";
  }
  if (input.viewerAccess === "VIEW_LIMITED" || input.viewerAccess === "NO_ACCESS") {
    if (input.eventDisclosure === "EXACT" || input.eventDisclosure === "VENUE") {
      return "CITY";
    }
    return input.eventDisclosure;
  }
  return input.eventDisclosure;
}
