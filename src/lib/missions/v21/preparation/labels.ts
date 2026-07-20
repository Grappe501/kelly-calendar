import type { PreparationReadinessState } from "@/lib/missions/v21/preparation/types";

export function labelPreparationReadiness(state: PreparationReadinessState): string {
  switch (state) {
    case "READY":
      return "Ready";
    case "NEEDS_ATTENTION":
      return "Needs attention";
    case "DRAFT":
    default:
      return "Draft";
  }
}
