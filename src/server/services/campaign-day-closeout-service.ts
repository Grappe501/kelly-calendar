import "server-only";

import {
  addDaysToDateKey,
  assertCloseoutDateInRange,
  buildCampaignDayCloseoutViewModel,
  campaignDayBounds,
  carryForwardImportKey,
  DEFAULT_DAY_CLOSEOUT_CONFIG,
  validateCarryForwardCreate,
  validateCarryForwardPatch,
  validateCloseoutContentPatch,
  type CampaignDayCarryForwardSourceType,
  type CampaignDayCloseoutViewModel,
} from "@/lib/missions/v21/day-closeout";
import { missionIntersectsCampaignDay } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import {
  createCarryForwardItem,
  ensureCloseoutStarted,
  findCloseoutByDateKey,
  updateCarryForwardItem,
  updateCloseoutContent,
} from "@/server/repositories/campaign-day-closeout-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Campaign Day Closeout requires campaign leadership access.",
    );
  }
}

async function loadMissionPools(dateKey: string, now: Date) {
  const config = DEFAULT_DAY_CLOSEOUT_CONFIG;
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const { start, end } = campaignDayBounds(dateKey, campaignTimezone);
  const tomorrowKey = addDaysToDateKey(dateKey, 1);
  const tomorrowBounds = campaignDayBounds(tomorrowKey, campaignTimezone);
  const lookbackStart = new Date(
    start.getTime() - config.allowedPastDays * 86_400_000,
  );
  const rangeStart =
    start.getTime() < tomorrowBounds.start.getTime()
      ? start
      : tomorrowBounds.start;
  const rangeEnd =
    end.getTime() > tomorrowBounds.end.getTime()
      ? end
      : tomorrowBounds.end;

  const all = await loadMissionsForDayBriefing({
    rangeStart,
    rangeEnd,
    operationalLookbackStart: lookbackStart,
    now,
  });

  const dayMissions = all.filter((m) =>
    missionIntersectsCampaignDay(
      m.startsAt,
      m.endsAt,
      dateKey,
      campaignTimezone,
    ),
  );
  const tomorrowMissions = all.filter((m) =>
    missionIntersectsCampaignDay(
      m.startsAt,
      m.endsAt,
      tomorrowKey,
      campaignTimezone,
    ),
  );
  const operationalMissions = all.filter(
    (m) =>
      m.followUp.actions.length > 0 ||
      m.followUp.status === "READY_TO_CLOSE" ||
      m.debrief.status === "COMPLETED" ||
      m.debrief.status === "IN_PROGRESS" ||
      m.debrief.status === "NOT_STARTED",
  );

  return { dayMissions, tomorrowMissions, operationalMissions, campaignTimezone };
}

export async function getCampaignDayCloseout(options: {
  dateKey?: string;
  now?: Date;
  actor: AuthenticatedActor;
}): Promise<CampaignDayCloseoutViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const todayKey = campaignDateKey(now, campaignTimezone);
  const dateKey = options.dateKey ?? todayKey;

  const ranged = assertCloseoutDateInRange(dateKey, now, campaignTimezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const pools = await loadMissionPools(dateKey, now);
  const closeout = await findCloseoutByDateKey(dateKey);

  return buildCampaignDayCloseoutViewModel({
    campaignDate: dateKey,
    now,
    campaignTimezone: pools.campaignTimezone,
    dayMissions: pools.dayMissions,
    tomorrowMissions: pools.tomorrowMissions,
    operationalMissions: pools.operationalMissions,
    closeout,
  });
}

export async function startCampaignDayCloseout(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<CampaignDayCloseoutViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertCloseoutDateInRange(
    options.dateKey,
    now,
    campaignTimezone,
  );
  if (!ranged.ok) throw new ValidationError(ranged.error);

  await ensureCloseoutStarted({
    campaignDateKey: options.dateKey,
    actorUserId: options.actor.userId,
    now,
  });
  return getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function patchCampaignDayCloseout(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayCloseoutViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertCloseoutDateInRange(
    options.dateKey,
    now,
    campaignTimezone,
  );
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const validated = validateCloseoutContentPatch(
    options.body,
    DEFAULT_DAY_CLOSEOUT_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);

  const closeout = await ensureCloseoutStarted({
    campaignDateKey: options.dateKey,
    actorUserId: options.actor.userId,
    now,
  });

  if (closeout.status === "SIGNED_OFF") {
    throw new ValidationError(
      "Signed-off days cannot be edited without an amendment workflow.",
    );
  }

  const { expectedUpdatedAt, ...fields } = validated.patch as {
    expectedUpdatedAt?: string | null;
    todayAssessment?: CampaignDayCloseoutViewModel["closeout"]["todayAssessment"];
    tomorrowReadiness?: CampaignDayCloseoutViewModel["closeout"]["tomorrowReadiness"];
    closeoutSummary?: string | null;
    carryForwardSummary?: string | null;
    tomorrowSummary?: string | null;
    internalNotes?: string | null;
  };

  await updateCloseoutContent({
    closeoutId: closeout.id,
    expectedUpdatedAt,
    data: fields,
    actorUserId: options.actor.userId,
  });

  return getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function completeCampaignDayReview(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayCloseoutViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const model = await getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });

  if (model.closeout.status === "SIGNED_OFF") {
    throw new ValidationError("Signed-off days cannot be re-reviewed casually.");
  }

  // Apply any content in the same request first
  if (options.body && typeof options.body === "object") {
    const validated = validateCloseoutContentPatch(
      options.body,
      DEFAULT_DAY_CLOSEOUT_CONFIG,
    );
    if (!validated.ok) throw new ValidationError(validated.error);
    const closeout = await ensureCloseoutStarted({
      campaignDateKey: options.dateKey,
      actorUserId: options.actor.userId,
      now,
    });
    const { expectedUpdatedAt, ...fields } = validated.patch as {
      expectedUpdatedAt?: string | null;
    } & Record<string, unknown>;
    await updateCloseoutContent({
      closeoutId: closeout.id,
      expectedUpdatedAt,
      data: fields as Parameters<typeof updateCloseoutContent>[0]["data"],
      actorUserId: options.actor.userId,
    });
  }

  const refreshed = await getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });

  if (refreshed.reviewBlockers.length > 0) {
    throw new ValidationError(refreshed.reviewBlockers[0]);
  }

  const closeout = await findCloseoutByDateKey(options.dateKey);
  if (!closeout) throw new NotFoundError("Closeout record not found.");

  const bodyObj =
    options.body && typeof options.body === "object"
      ? (options.body as { expectedUpdatedAt?: string })
      : {};

  await updateCloseoutContent({
    closeoutId: closeout.id,
    expectedUpdatedAt: bodyObj.expectedUpdatedAt ?? closeout.updatedAt,
    data: {
      status: "REVIEWED",
      reviewedAt: now,
      reviewedByUserId: options.actor.userId,
    },
    actorUserId: options.actor.userId,
  });

  return getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function signOffCampaignDayCloseout(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayCloseoutViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const model = await getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });

  if (model.signoffBlockers.length > 0) {
    throw new ValidationError(model.signoffBlockers[0]);
  }
  if (model.closeout.status !== "REVIEWED") {
    throw new ValidationError("Day review must be completed before signoff.");
  }

  const closeout = await findCloseoutByDateKey(options.dateKey);
  if (!closeout) throw new NotFoundError("Closeout record not found.");

  const bodyObj =
    options.body && typeof options.body === "object"
      ? (options.body as { expectedUpdatedAt?: string; confirm?: boolean })
      : {};
  if (bodyObj.confirm !== true) {
    throw new ValidationError(
      "Signoff requires explicit confirmation (confirm: true).",
    );
  }

  await updateCloseoutContent({
    closeoutId: closeout.id,
    expectedUpdatedAt: bodyObj.expectedUpdatedAt ?? closeout.updatedAt,
    data: {
      status: "SIGNED_OFF",
      signedOffAt: now,
      signedOffByUserId: options.actor.userId,
    },
    actorUserId: options.actor.userId,
  });

  return getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function addCarryForwardToCloseout(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<{
  model: CampaignDayCloseoutViewModel;
  added: number;
  alreadyPresent: number;
}> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertCloseoutDateInRange(
    options.dateKey,
    now,
    campaignTimezone,
  );
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const items = Array.isArray(
    (options.body as { items?: unknown })?.items,
  )
    ? ((options.body as { items: unknown[] }).items)
    : [options.body];

  const closeout = await ensureCloseoutStarted({
    campaignDateKey: options.dateKey,
    actorUserId: options.actor.userId,
    now,
  });
  if (closeout.status === "SIGNED_OFF") {
    throw new ValidationError("Cannot add carry-forward to a signed-off day.");
  }

  let added = 0;
  let alreadyPresent = 0;

  for (const raw of items) {
    const validated = validateCarryForwardCreate(raw);
    if (!validated.ok) throw new ValidationError(validated.error);
    const p = validated.patch as {
      sourceType: CampaignDayCarryForwardSourceType;
      sourceRecordId: string | null;
      missionId: string | null;
      title: string;
      reason: string | null;
      ownerName: string | null;
      ownerUserId: string | null;
      targetDateKey: string | null;
      destination: string | null;
      clientKey: string | null;
    };
    const importKey =
      p.sourceType === "OPERATOR_ADDED"
        ? carryForwardImportKey(
            "OPERATOR_ADDED",
            p.clientKey ?? `op:${p.title}:${Date.now()}`,
          )
        : carryForwardImportKey(
            p.sourceType,
            p.sourceRecordId ?? p.missionId ?? p.title,
          );

    const result = await createCarryForwardItem({
      closeoutId: closeout.id,
      sourceType: p.sourceType,
      sourceRecordId: p.sourceRecordId,
      importKey,
      missionId: p.missionId,
      title: p.title,
      reason: p.reason,
      ownerName: p.ownerName,
      ownerUserId: p.ownerUserId,
      targetDateKey: p.targetDateKey,
      destination: p.destination,
      actorUserId: options.actor.userId,
    });
    if (result.created) added += 1;
    else alreadyPresent += 1;
  }

  const model = await getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
  return { model, added, alreadyPresent };
}

export async function patchCarryForwardOnCloseout(options: {
  dateKey: string;
  itemId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayCloseoutViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertCloseoutDateInRange(
    options.dateKey,
    now,
    campaignTimezone,
  );
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const closeout = await findCloseoutByDateKey(options.dateKey);
  if (!closeout) throw new NotFoundError("Closeout record not found.");
  if (closeout.status === "SIGNED_OFF") {
    throw new ValidationError(
      "Cannot update carry-forward on a signed-off day.",
    );
  }

  const item = closeout.carryForwardItems.find((i) => i.id === options.itemId);
  if (!item) throw new NotFoundError("Carry-forward item not found.");

  const validated = validateCarryForwardPatch(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const p = validated.patch as {
    status?: CampaignDayCloseoutViewModel["carryForwardItems"][0]["status"];
    ownerName?: string | null;
    ownerUserId?: string | null;
    targetDateKey?: string | null;
    reason?: string | null;
    destination?: string | null;
    cancellationReason?: string | null;
  };

  await updateCarryForwardItem({
    itemId: options.itemId,
    data: {
      ...p,
      resolvedAt:
        p.status === "RESOLVED" || p.status === "CANCELLED" ? now : undefined,
      resolvedByUserId:
        p.status === "RESOLVED" || p.status === "CANCELLED"
          ? options.actor.userId
          : undefined,
    },
  });

  return getCampaignDayCloseout({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}
