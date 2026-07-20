import type { DigestIncidentEntry } from "@/lib/missions/v21/exception-digest/types";
import {
  selectLaunchQualifiedEntries,
  selectTomorrowPreviewEntries,
} from "@/lib/missions/v21/exception-digest/derive-digest";

export type CloseoutExceptionDigestPanel = {
  href: string;
  openHighCriticalCount: number;
  postCloseoutUpdateCount: number;
  explicitCarryForwardCount: number;
  followUpGapCount: number;
  reviewStatus: string;
  isStale: boolean;
  highCriticalEntries: DigestIncidentEntry[];
  postCloseoutEntries: DigestIncidentEntry[];
  carryForwardEntries: DigestIncidentEntry[];
  followUpGapEntries: DigestIncidentEntry[];
  tomorrowPreview: DigestIncidentEntry[];
};

/**
 * Closeout subsection model. Completing digest review does not complete Closeout
 * and completing Closeout does not complete digest review.
 */
export function buildCloseoutExceptionDigestPanel(input: {
  campaignDateKey: string;
  entries: DigestIncidentEntry[];
  reviewStatus: string;
  isStale: boolean;
}): CloseoutExceptionDigestPanel {
  const highCritical = input.entries.filter((e) =>
    e.buckets.includes("OPEN_HIGH_CRITICAL"),
  );
  const postCloseout = input.entries.filter((e) =>
    e.buckets.includes("UPDATED_AFTER_CLOSEOUT"),
  );
  const carry = input.entries.filter((e) =>
    e.buckets.includes("EXPLICIT_CARRY_FORWARD"),
  );
  const gaps = input.entries.filter((e) => e.buckets.includes("FOLLOW_UP_GAP"));
  return {
    href: `/system/briefing/${input.campaignDateKey}/exceptions`,
    openHighCriticalCount: highCritical.length,
    postCloseoutUpdateCount: postCloseout.length,
    explicitCarryForwardCount: carry.length,
    followUpGapCount: gaps.length,
    reviewStatus: input.reviewStatus,
    isStale: input.isStale,
    highCriticalEntries: highCritical,
    postCloseoutEntries: postCloseout,
    carryForwardEntries: carry,
    followUpGapEntries: gaps,
    tomorrowPreview: selectTomorrowPreviewEntries(input.entries),
  };
}

export function buildLaunchExceptionDigestPanel(input: {
  campaignDateKey: string;
  entries: DigestIncidentEntry[];
}) {
  const qualified = selectLaunchQualifiedEntries(input.entries);
  return {
    href: `/system/briefing/${input.campaignDateKey}/exceptions`,
    qualifiedCount: qualified.length,
    overnightCount: qualified.filter((e) => e.buckets.includes("OVERNIGHT"))
      .length,
    carryForwardCount: qualified.filter((e) =>
      e.buckets.includes("EXPLICIT_CARRY_FORWARD"),
    ).length,
    highCriticalCount: qualified.filter((e) =>
      e.buckets.includes("OPEN_HIGH_CRITICAL"),
    ).length,
    entries: qualified,
  };
}
