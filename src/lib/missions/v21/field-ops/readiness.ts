import {
  fieldOpsDispositionClearsForReadiness,
  labelFindingSeverity,
} from "@/lib/missions/v21/field-ops/labels";
import type { FieldOpsConfig } from "@/lib/missions/v21/field-ops/field-ops-config";
import type {
  FieldOpsFinding,
  FieldOpsLogisticsItemRef,
  FieldOpsMissionContext,
  MissionFieldItemConfirmationPersisted,
  MissionFieldOpsReadiness,
  MissionFieldOpsSessionPersisted,
} from "@/lib/missions/v21/field-ops/types";

export const scheduleFingerprint = (startsAt: string, endsAt: string) =>
  `${startsAt}|${endsAt}`;
export const travelFingerprint = (plannedDepartureAt: string | null) =>
  plannedDepartureAt ?? "";

export function logisticsFingerprint(
  items: FieldOpsLogisticsItemRef[],
): string {
  return items
    .filter((item) => !["CANCELLED", "NOT_APPLICABLE"].includes(item.status))
    .map(
      (item) =>
        `${item.id}:${item.criticality}:${item.returnRequired ? 1 : 0}:${item.quantityLabel ?? ""}:${item.description}`,
    )
    .sort()
    .join("|");
}

export const issueKey = (issueType: string, scopeId: string) =>
  `${issueType}:${scopeId}`;

const activeItem = (item: FieldOpsLogisticsItemRef) =>
  item.status !== "CANCELLED" && item.status !== "NOT_APPLICABLE";

const fieldRequired = (ctx: FieldOpsMissionContext) => {
  if (ctx.pack?.logisticsRequired != null) return ctx.pack.logisticsRequired;
  if (ctx.materialsIndicated) return true;
  return Boolean(
    ctx.pack?.items.some(
      (item) => activeItem(item) && item.criticality === "CRITICAL",
    ),
  );
};

const confirmationFor = (
  session: MissionFieldOpsSessionPersisted | null,
  itemId: string,
): MissionFieldItemConfirmationPersisted | null =>
  session?.confirmations.find((c) => c.logisticsItemId === itemId) ?? null;

const sessionOpen = (session: MissionFieldOpsSessionPersisted | null) =>
  Boolean(session && !["CLOSED", "CANCELLED"].includes(session.status));

export function evaluateFieldOpsFindings(input: {
  context: FieldOpsMissionContext;
  session: MissionFieldOpsSessionPersisted | null;
  config: FieldOpsConfig;
}): FieldOpsFinding[] {
  const { context: ctx, session } = input;
  const findings: FieldOpsFinding[] = [];
  const push = (
    f: Omit<
      FieldOpsFinding,
      "disposition" | "clearsForReadiness" | "severityLabel"
    >,
  ) => {
    const ack = session?.acknowledgements.find((a) => a.issueKey === f.issueKey);
    findings.push({
      ...f,
      severityLabel: labelFindingSeverity(f.severity),
      disposition: ack?.disposition ?? null,
      clearsForReadiness: fieldOpsDispositionClearsForReadiness(ack?.disposition),
    });
  };

  if (ctx.isCancelled && sessionOpen(session)) {
    push({
      issueKey: issueKey("CANCELLED_MISSION_OPEN_SESSION", ctx.missionId),
      issueType: "CANCELLED_MISSION_OPEN_SESSION",
      title: "Open field session on cancelled Mission",
      explanation:
        "The Mission is cancelled, but the Field Ops session remains open.",
      severity: "WARNING",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
  }

  if (!fieldRequired(ctx)) {
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  const packActive =
    ctx.pack && !["INACTIVE", "CANCELLED"].includes(ctx.pack.status);
  if (!packActive) {
    push({
      issueKey: issueKey("NO_PACK", ctx.missionId),
      issueType: "NO_PACK",
      title: "Logistics required but no active pack",
      explanation:
        "Field Ops needs D12 logistics requirements, but no active pack is stored.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  const items = ctx.pack!.items.filter(activeItem);
  const criticalItems = items.filter((item) => item.criticality === "CRITICAL");

  if (!sessionOpen(session) && criticalItems.length > 0) {
    push({
      issueKey: issueKey("NO_SESSION", ctx.missionId),
      issueType: "NO_SESSION",
      title: "Field check required but no session opened",
      explanation:
        "Critical logistics items exist, but no intentional Field Ops session has been opened.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  if (!session) {
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  for (const item of criticalItems) {
    const conf = confirmationFor(session, item.id);
    if (!conf) {
      push({
        issueKey: issueKey("CRITICAL_UNCONFIRMED", item.id),
        issueType: "CRITICAL_UNCONFIRMED",
        title: `Critical item unconfirmed: ${item.description}`,
        explanation:
          "A critical D12 item has no on-site Field Ops confirmation. Packed/handed off/received does not imply presence.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
        logisticsItemId: item.id,
      });
      continue;
    }
    if (conf.state === "MISSING") {
      push({
        issueKey: issueKey("CRITICAL_MISSING", item.id),
        issueType: "CRITICAL_MISSING",
        title: `Critical item missing: ${item.description}`,
        explanation: "Field confirmation recorded this critical item as missing.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
        logisticsItemId: item.id,
      });
    } else if (conf.state === "DAMAGED") {
      push({
        issueKey: issueKey("CRITICAL_DAMAGED", item.id),
        issueType: "CRITICAL_DAMAGED",
        title: `Critical item damaged: ${item.description}`,
        explanation: "Field confirmation recorded this critical item as damaged.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
        logisticsItemId: item.id,
      });
    } else if (conf.state === "NOT_USABLE") {
      push({
        issueKey: issueKey("CRITICAL_NOT_USABLE", item.id),
        issueType: "CRITICAL_NOT_USABLE",
        title: `Critical item not usable: ${item.description}`,
        explanation:
          "Field confirmation recorded this critical item as not usable.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
        logisticsItemId: item.id,
      });
    } else if (conf.state === "SUBSTITUTED") {
      push({
        issueKey: issueKey("CRITICAL_SUBSTITUTED", item.id),
        issueType: "CRITICAL_SUBSTITUTED",
        title: `Critical item substituted: ${item.description}`,
        explanation:
          "A substitute was recorded for a critical item. Accept risk or resolve explicitly.",
        severity: "BLOCKER",
        missionId: ctx.missionId,
        logisticsItemId: item.id,
      });
      const subKey = issueKey("SUBSTITUTE_UNACCEPTED", item.id);
      const subAck = session.acknowledgements.find((a) => a.issueKey === subKey);
      if (
        !subAck ||
        !fieldOpsDispositionClearsForReadiness(subAck.disposition)
      ) {
        push({
          issueKey: subKey,
          issueType: "SUBSTITUTE_UNACCEPTED",
          title: `Substitute not accepted: ${item.description}`,
          explanation:
            "A substitute is recorded but has not been explicitly accepted as risk or resolved.",
          severity: "BLOCKER",
          missionId: ctx.missionId,
          logisticsItemId: item.id,
        });
      }
    }
  }

  for (const handoff of ctx.pack!.handoffs.filter((h) => h.status !== "CANCELLED")) {
    if (handoff.status !== "COMPLETED") {
      const critical = handoff.logisticsItemId
        ? criticalItems.some((i) => i.id === handoff.logisticsItemId)
        : false;
      push({
        issueKey: issueKey("HANDOFF_INCOMPLETE_AT_CHECK", handoff.id),
        issueType: "HANDOFF_INCOMPLETE_AT_CHECK",
        title: "D12 handoff incomplete at field check",
        explanation:
          "A logistics handoff remains incomplete. Field Ops does not rewrite the handoff record.",
        severity: critical ? "BLOCKER" : "WARNING",
        missionId: ctx.missionId,
        logisticsItemId: handoff.logisticsItemId,
      });
    }
  }

  const wrapMode =
    session.status === "WRAP_PENDING" ||
    session.status === "CLOSED" ||
    Boolean(session.wrapStartedAt);

  for (const item of items.filter((i) => i.returnRequired)) {
    const conf = confirmationFor(session, item.id);
    if (wrapMode) {
      if (!conf || !["RETURNED", "NOT_APPLICABLE"].includes(conf.state)) {
        if (conf?.state === "RETURN_MISSING") {
          push({
            issueKey: issueKey("RETURN_MISSING", item.id),
            issueType: "RETURN_MISSING",
            title: `Return missing: ${item.description}`,
            explanation:
              "A return-required item was confirmed missing at wrap.",
            severity: "BLOCKER",
            missionId: ctx.missionId,
            logisticsItemId: item.id,
          });
        } else if (conf?.state === "DAMAGED") {
          push({
            issueKey: issueKey("RETURN_DAMAGED", item.id),
            issueType: "RETURN_DAMAGED",
            title: `Return damaged: ${item.description}`,
            explanation:
              "A return-required item was confirmed damaged at wrap.",
            severity: "WARNING",
            missionId: ctx.missionId,
            logisticsItemId: item.id,
          });
        } else {
          push({
            issueKey: issueKey("RETURN_OUTSTANDING", item.id),
            issueType: "RETURN_OUTSTANDING",
            title: `Return outstanding: ${item.description}`,
            explanation:
              "A return-required D12 item has no returned/disposition confirmation at wrap.",
            severity: "WARNING",
            missionId: ctx.missionId,
            logisticsItemId: item.id,
          });
        }
      }
    }
  }

  if (
    session.logisticsFingerprint &&
    session.logisticsFingerprint !== logisticsFingerprint(items)
  ) {
    push({
      issueKey: issueKey("STALE_AFTER_LOGISTICS_CHANGE", session.id),
      issueType: "STALE_AFTER_LOGISTICS_CHANGE",
      title: "Field readiness stale after logistics change",
      explanation:
        "Critical D12 logistics requirements changed after field readiness was confirmed.",
      severity: "WARNING",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
  }
  if (
    session.scheduleFingerprint &&
    session.scheduleFingerprint !==
      scheduleFingerprint(ctx.startsAt, ctx.endsAt)
  ) {
    push({
      issueKey: issueKey("STALE_AFTER_RESCHEDULE", session.id),
      issueType: "STALE_AFTER_RESCHEDULE",
      title: "Field readiness stale after Mission schedule change",
      explanation:
        "Mission start or end changed after field readiness confirmation.",
      severity: "WARNING",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
  }
  if (
    session.travelFingerprint !== null &&
    session.travelFingerprint !==
      travelFingerprint(ctx.travelPlannedDepartureAt)
  ) {
    push({
      issueKey: issueKey("STALE_AFTER_TRAVEL_CHANGE", session.id),
      issueType: "STALE_AFTER_TRAVEL_CHANGE",
      title: "Field readiness stale after travel change",
      explanation:
        "Stored travel departure differs from the field readiness confirmation fingerprint.",
      severity: "WARNING",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
  }
  if (session.campaignDateKey !== ctx.campaignDateKey) {
    push({
      issueKey: issueKey("WRONG_CAMPAIGN_DAY", session.id),
      issueType: "WRONG_CAMPAIGN_DAY",
      title: "Field session associated with another campaign day",
      explanation:
        "The session campaign date does not match the Mission campaign date.",
      severity: "WARNING",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
  }

  const endsDate = ctx.endsAt.slice(0, 10);
  const startsDate = ctx.startsAt.slice(0, 10);
  if (
    endsDate !== startsDate &&
    sessionOpen(session) &&
    (session.status === "WRAP_PENDING" ||
      items.some((i) => i.returnRequired && !confirmationFor(session, i.id)))
  ) {
    push({
      issueKey: issueKey("OVERNIGHT_WRAP_OPEN", session.id),
      issueType: "OVERNIGHT_WRAP_OPEN",
      title: "Cross-midnight Mission has open wrap/return obligations",
      explanation:
        "This Mission spans campaign midnights and still has open Field Ops wrap or return work.",
      severity: "WARNING",
      missionId: ctx.missionId,
      logisticsItemId: null,
    });
  }

  return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
}

export function deriveFieldOpsReadiness(input: {
  context: FieldOpsMissionContext;
  session: MissionFieldOpsSessionPersisted | null;
  findings: FieldOpsFinding[];
}): MissionFieldOpsReadiness {
  if (!fieldRequired(input.context)) return "NOT_REQUIRED";
  if (input.session?.status === "WRAP_PENDING") {
    const blockers = input.findings.filter((f) => f.severity === "BLOCKER");
    if (blockers.some((f) => !f.clearsForReadiness)) return "NOT_READY";
    return "WRAP_PENDING";
  }
  const blockers = input.findings.filter((f) => f.severity === "BLOCKER");
  if (blockers.some((f) => !f.clearsForReadiness)) return "NOT_READY";
  if (blockers.some((f) => f.disposition === "ACCEPTED_RISK")) {
    return "READY_WITH_ACCEPTED_RISK";
  }
  if (!sessionOpen(input.session)) {
    return blockers.length > 0 ? "READY_WITH_ACCEPTED_RISK" : "NOT_READY";
  }
  return "READY";
}
