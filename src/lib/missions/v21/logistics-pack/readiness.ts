import { dispositionClearsForReadiness, labelFindingSeverity } from "@/lib/missions/v21/logistics-pack/labels";
import type { LogisticsFinding, LogisticsMissionContext, MissionLogisticsAcknowledgementPersisted, MissionLogisticsPackPersisted, MissionLogisticsReadiness } from "@/lib/missions/v21/logistics-pack/types";
import type { LogisticsPackConfig } from "@/lib/missions/v21/logistics-pack/logistics-config";

export const scheduleFingerprint = (startsAt: string, endsAt: string) => `${startsAt}|${endsAt}`;
export const travelFingerprint = (plannedDepartureAt: string | null) => plannedDepartureAt ?? "";
export const issueKey = (issueType: string, scopeId: string) => `${issueType}:${scopeId}`;
const active = (status: string) => status !== "CANCELLED" && status !== "NOT_APPLICABLE";
const packed = (status: string) => ["PACKED", "HANDED_OFF", "RECEIVED", "READY", "USED", "RETURN_PENDING", "RETURNED"].includes(status);
const required = (ctx: LogisticsMissionContext, pack: MissionLogisticsPackPersisted | null) => pack?.logisticsRequired ?? ctx.materialsIndicated;

export function evaluateLogisticsFindings(input: { context: LogisticsMissionContext; pack: MissionLogisticsPackPersisted | null; config: LogisticsPackConfig }): LogisticsFinding[] {
  const { context: ctx, pack } = input;
  const findings: LogisticsFinding[] = [];
  const push = (f: Omit<LogisticsFinding, "disposition" | "clearsForReadiness" | "severityLabel">) => {
    const ack = pack?.acknowledgements.find((a) => a.issueKey === f.issueKey);
    findings.push({ ...f, severityLabel: labelFindingSeverity(f.severity), disposition: ack?.disposition ?? null, clearsForReadiness: dispositionClearsForReadiness(ack?.disposition) });
  };
  if (ctx.isCancelled && pack && !["CANCELLED", "INACTIVE"].includes(pack.status)) push({ issueKey: issueKey("CANCELLED_MISSION_ACTIVE_PACK", ctx.missionId), issueType: "CANCELLED_MISSION_ACTIVE_PACK", title: "Active logistics pack on cancelled Mission", explanation: "The Mission is cancelled, but its logistics pack remains active.", severity: "WARNING", missionId: ctx.missionId });
  if (!required(ctx, pack)) return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  if (!pack || ["INACTIVE", "CANCELLED"].includes(pack.status)) { push({ issueKey: issueKey("NO_PACK", ctx.missionId), issueType: "NO_PACK", title: "Logistics required but no active pack", explanation: "Materials are indicated, but no active field kit is stored.", severity: "BLOCKER", missionId: ctx.missionId }); return findings; }
  const items = pack.items.filter((i) => active(i.status));
  for (const item of items) {
    if (!item.description.trim()) push({ issueKey: issueKey("ITEM_INCOMPLETE", item.id), issueType: "ITEM_INCOMPLETE", title: `Item ${item.sequence} is incomplete`, explanation: "An active logistics item needs a description.", severity: "WARNING", missionId: ctx.missionId });
    if (item.criticality === "CRITICAL" && !item.responsibleName?.trim() && !item.responsibleUserId) push({ issueKey: issueKey("CRITICAL_UNASSIGNED", item.id), issueType: "CRITICAL_UNASSIGNED", title: `Critical item unassigned: ${item.description}`, explanation: "A critical active item has no responsible owner.", severity: "BLOCKER", missionId: ctx.missionId });
    if (item.criticality === "CRITICAL" && !packed(item.status)) push({ issueKey: issueKey("CRITICAL_NOT_PACKED", item.id), issueType: "CRITICAL_NOT_PACKED", title: `Critical item not packed: ${item.description}`, explanation: "A critical active item has not reached packed-or-better status.", severity: "BLOCKER", missionId: ctx.missionId });
    if (item.returnRequired && !["RETURNED", "CANCELLED", "NOT_APPLICABLE"].includes(item.status)) push({ issueKey: issueKey("RETURN_OUTSTANDING", item.id), issueType: "RETURN_OUTSTANDING", title: `Return outstanding: ${item.description}`, explanation: "This item is marked for return and is not recorded as returned.", severity: "WARNING", missionId: ctx.missionId });
  }
  for (const handoff of pack.handoffs.filter((h) => h.status !== "CANCELLED")) {
    const critical = handoff.logisticsItemId ? pack.items.find((i) => i.id === handoff.logisticsItemId)?.criticality === "CRITICAL" : false;
    const severity = critical ? "BLOCKER" : "WARNING" as const;
    if (handoff.status !== "COMPLETED") push({ issueKey: issueKey("HANDOFF_INCOMPLETE", handoff.id), issueType: "HANDOFF_INCOMPLETE", title: "Handoff incomplete", explanation: "An active handoff is not completed.", severity, missionId: ctx.missionId });
    if (Boolean(handoff.giverConfirmedAt) !== Boolean(handoff.receiverConfirmedAt)) push({ issueKey: issueKey("HANDOFF_PARTIAL_CONFIRM", handoff.id), issueType: "HANDOFF_PARTIAL_CONFIRM", title: "Handoff only partially confirmed", explanation: "One side confirmed the handoff but the other has not.", severity, missionId: ctx.missionId });
  }
  if (pack.scheduleFingerprint && pack.scheduleFingerprint !== scheduleFingerprint(ctx.startsAt, ctx.endsAt)) push({ issueKey: issueKey("STALE_AFTER_RESCHEDULE", pack.id), issueType: "STALE_AFTER_RESCHEDULE", title: "Pack not reconfirmed after Mission schedule change", explanation: "Mission start or end changed after the pack was last confirmed.", severity: "WARNING", missionId: ctx.missionId });
  if (pack.travelFingerprint !== null && pack.travelFingerprint !== travelFingerprint(ctx.travelPlannedDepartureAt)) push({ issueKey: issueKey("STALE_AFTER_TRAVEL_CHANGE", pack.id), issueType: "STALE_AFTER_TRAVEL_CHANGE", title: "Pack not reconfirmed after travel change", explanation: "The stored travel departure differs from the pack confirmation.", severity: "WARNING", missionId: ctx.missionId });
  if (pack.campaignDateKey !== ctx.campaignDateKey) push({ issueKey: issueKey("WRONG_CAMPAIGN_DAY", pack.id), issueType: "WRONG_CAMPAIGN_DAY", title: "Pack is associated with another campaign day", explanation: "The pack campaign date does not match the Mission campaign date.", severity: "WARNING", missionId: ctx.missionId });
  if (
    ctx.travelPlannedDepartureAt &&
    items.some((item) => item.criticality === "CRITICAL" && !packed(item.status))
  ) {
    push({
      issueKey: issueKey("DEPARTURE_NOT_READY", pack.id),
      issueType: "DEPARTURE_NOT_READY",
      title: "Critical items not ready before stored departure",
      explanation:
        "A Mission travel departure is stored and one or more critical logistics items are not packed-or-better.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
  }
  if (!pack.packOwnerName?.trim() && !pack.packOwnerUserId) {
    push({
      issueKey: issueKey("MISSING_OWNER", pack.id),
      issueType: "MISSING_OWNER",
      title: "Pack owner not identified",
      explanation: "An active logistics pack has no pack owner stored.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }
  return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
}

export function deriveLogisticsReadiness(input: { context: LogisticsMissionContext; pack: MissionLogisticsPackPersisted | null; findings: LogisticsFinding[] }): MissionLogisticsReadiness {
  if (!required(input.context, input.pack)) return "NOT_REQUIRED";
  const blockers = input.findings.filter((f) => f.severity === "BLOCKER");
  if (blockers.some((f) => !f.clearsForReadiness)) return "NOT_READY";
  if (blockers.some((f) => f.disposition === "ACCEPTED_RISK")) return "READY_WITH_ACCEPTED_RISK";
  if (!input.pack || ["INACTIVE", "CANCELLED"].includes(input.pack.status)) {
    // Required with no active pack and no open blockers means accepted/resolved disposition covered it.
    return blockers.length > 0 ? "READY_WITH_ACCEPTED_RISK" : "NOT_READY";
  }
  return "READY";
}
