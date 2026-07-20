import type { CommandCenterView } from "@/lib/missions/v21/command-center/types";
import type { MissionLifecyclePhase } from "@/lib/missions/v21/types";

const VIEWS = new Set<CommandCenterView>([
  "overview",
  "attention",
  "prepare",
  "execute",
  "debrief",
  "follow-up",
  "closeout",
]);

const PHASES = new Set<MissionLifecyclePhase>([
  "PREPARE",
  "TRAVEL",
  "EXECUTE",
  "DEBRIEF",
  "FOLLOW_UP",
  "COMPLETE",
]);

export type CommandCenterFilterInput = {
  view?: string | null;
  phase?: string | null;
  search?: string | null;
};

export type ParsedCommandCenterFilters = {
  activeView: CommandCenterView;
  phase: MissionLifecyclePhase | null;
  search: string | null;
};

/**
 * Validate query parameters. Unknown values fall back safely.
 */
export function parseCommandCenterFilters(
  input: CommandCenterFilterInput,
): ParsedCommandCenterFilters {
  const rawView = (input.view ?? "overview").toLowerCase();
  const activeView = VIEWS.has(rawView as CommandCenterView)
    ? (rawView as CommandCenterView)
    : "overview";

  const rawPhase = input.phase?.toUpperCase() ?? null;
  const phase =
    rawPhase && PHASES.has(rawPhase as MissionLifecyclePhase)
      ? (rawPhase as MissionLifecyclePhase)
      : null;

  let search: string | null = null;
  if (input.search != null) {
    const trimmed = input.search.trim().slice(0, 80);
    search = trimmed.length > 0 ? trimmed : null;
  }

  return { activeView, phase, search };
}

export function missionMatchesSearch(
  haystacks: Array<string | null | undefined>,
  search: string | null,
): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return haystacks.some((h) => h && h.toLowerCase().includes(q));
}
