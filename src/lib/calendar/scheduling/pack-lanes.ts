/**
 * CC-08 Scheduling Layout Engine — timed-event lane packing (pure).
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Half-open interval overlap: [start, end). Two items that merely touch
 * (a.endMs === b.startMs) do NOT overlap and never share a cluster.
 */

export type PackableTimedItem = {
  id: string;
  startMs: number;
  endMs: number;
};

export type LaneAssignment = {
  lane: number;
  laneCount: number;
};

/** Half-open [aStart, aEnd) overlaps [bStart, bEnd). Touching is not overlap. */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function compareItems(a: PackableTimedItem, b: PackableTimedItem): number {
  if (a.startMs !== b.startMs) return a.startMs - b.startMs;
  if (a.endMs !== b.endMs) return a.endMs - b.endMs;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Greedy lane assignment within one already-clustered overlap group.
 * Produces the minimum number of lanes for an interval graph (equal to
 * the maximum concurrent overlap count in the cluster).
 */
function assignLanesWithinCluster(
  items: PackableTimedItem[],
  result: Map<string, LaneAssignment>,
): void {
  const laneEndMs: number[] = [];
  const laneOfId = new Map<string, number>();

  for (const item of items) {
    let placedLane = -1;
    for (let lane = 0; lane < laneEndMs.length; lane += 1) {
      if (item.startMs >= laneEndMs[lane]) {
        laneEndMs[lane] = item.endMs;
        placedLane = lane;
        break;
      }
    }
    if (placedLane === -1) {
      laneEndMs.push(item.endMs);
      placedLane = laneEndMs.length - 1;
    }
    laneOfId.set(item.id, placedLane);
  }

  const laneCount = laneEndMs.length;
  for (const item of items) {
    result.set(item.id, { lane: laneOfId.get(item.id) ?? 0, laneCount });
  }
}

/**
 * Pack timed items into overlap-free lanes.
 *
 * - Stable sort: start asc, then end asc, then id asc.
 * - Items are clustered into maximal overlap groups (half-open semantics —
 *   touching boundaries never join a cluster).
 * - Lanes are assigned greedily per cluster; `laneCount` is the maximum
 *   concurrent overlap within that cluster (shared by every item in it).
 *
 * Pure: never mutates `items`, has no side effects.
 */
export function packTimedLanes(items: PackableTimedItem[]): Map<string, LaneAssignment> {
  const result = new Map<string, LaneAssignment>();
  if (items.length === 0) return result;

  const sorted = [...items].sort(compareItems);

  let cluster: PackableTimedItem[] = [];
  let clusterEndMs = -Infinity;

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMs >= clusterEndMs) {
      assignLanesWithinCluster(cluster, result);
      cluster = [];
      clusterEndMs = -Infinity;
    }
    cluster.push(item);
    clusterEndMs = Math.max(clusterEndMs, item.endMs);
  }
  if (cluster.length > 0) {
    assignLanesWithinCluster(cluster, result);
  }

  return result;
}
