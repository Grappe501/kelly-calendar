import "server-only";

import {
  addDaysToDateKey,
  campaignDayBounds,
  missionIntersectsCampaignDay,
} from "@/lib/missions/v21/day-briefing";
import {
  acknowledgementImportKey,
  assertLaunchDateInRange,
  buildCampaignDayLaunchReviewViewModel,
  DEFAULT_DAY_LAUNCH_CONFIG,
  validateAcknowledgementCreate,
  validateAcknowledgementPatch,
  validateLaunchContentPatch,
  type CampaignDayLaunchAcknowledgementStatus,
  type CampaignDayLaunchAcknowledgementType,
  type CampaignDayLaunchReviewViewModel,
  type CampaignDayLaunchSourceType,
} from "@/lib/missions/v21/day-launch";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import { findCloseoutByDateKey } from "@/server/repositories/campaign-day-closeout-repository";
import {
  ensureLaunchReviewStarted,
  findLaunchReviewByDateKey,
  updateLaunchAcknowledgement,
  updateLaunchReviewContent,
  upsertLaunchAcknowledgement,
} from "@/server/repositories/campaign-day-launch-review-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Morning Launch Review requires campaign leadership access.",
    );
  }
}

async function loadPools(dateKey: string, now: Date) {
  const config = DEFAULT_DAY_LAUNCH_CONFIG;
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const { start, end } = campaignDayBounds(dateKey, campaignTimezone);
  const lookbackStart = new Date(
    start.getTime() - config.allowedPastDays * 86_400_000,
  );
  const all = await loadMissionsForDayBriefing({
    rangeStart: start,
    rangeEnd: end,
    operationalLookbackStart: lookbackStart,
    now,
  });
  const dayMissions = all.filter((m) =>
    missionIntersectsCampaignDay(m.startsAt, m.endsAt, dateKey, campaignTimezone),
  );
  const operationalMissions = all.filter(
    (m) =>
      m.followUp.actions.length > 0 ||
      m.followUp.status === "READY_TO_CLOSE" ||
      m.debrief.status === "COMPLETED",
  );
  return { dayMissions, operationalMissions, campaignTimezone };
}

export async function getCampaignDayLaunchReview(options: {
  dateKey?: string;
  now?: Date;
  actor: AuthenticatedActor;
}): Promise<CampaignDayLaunchReviewViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const todayKey = campaignDateKey(now, campaignTimezone);
  const dateKey = options.dateKey ?? todayKey;
  const ranged = assertLaunchDateInRange(dateKey, now, campaignTimezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const pools = await loadPools(dateKey, now);
  const priorDateKey = addDaysToDateKey(dateKey, -1);
  const [launchReview, priorCloseout] = await Promise.all([
    findLaunchReviewByDateKey(dateKey),
    findCloseoutByDateKey(priorDateKey),
  ]);
  const { findLogisticsPacksByMissionIds } = await import(
    "@/server/repositories/mission-logistics-repository"
  );
  const logisticsPacksByMissionId = await findLogisticsPacksByMissionIds(
    pools.dayMissions.map((m) => m.missionId),
  );

  return buildCampaignDayLaunchReviewViewModel({
    campaignDate: dateKey,
    now,
    campaignTimezone: pools.campaignTimezone,
    dayMissions: pools.dayMissions,
    operationalMissions: pools.operationalMissions,
    priorCloseout,
    priorCloseoutDateKey: priorDateKey,
    launchReview,
    logisticsPacksByMissionId,
  });
}

export async function startCampaignDayLaunchReview(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<CampaignDayLaunchReviewViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertLaunchDateInRange(options.dateKey, now, campaignTimezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);
  await ensureLaunchReviewStarted({
    campaignDateKey: options.dateKey,
    actorUserId: options.actor.userId,
    now,
  });
  return getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function patchCampaignDayLaunchReview(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayLaunchReviewViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertLaunchDateInRange(options.dateKey, now, campaignTimezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const validated = validateLaunchContentPatch(
    options.body,
    DEFAULT_DAY_LAUNCH_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);

  const launch = await ensureLaunchReviewStarted({
    campaignDateKey: options.dateKey,
    actorUserId: options.actor.userId,
    now,
  });
  if (launch.status === "LAUNCHED") {
    throw new ValidationError(
      "Launched days cannot be edited without an amendment workflow.",
    );
  }

  const { expectedUpdatedAt, ...fields } = validated.patch as {
    expectedUpdatedAt?: string | null;
  } & Record<string, unknown>;

  await updateLaunchReviewContent({
    launchReviewId: launch.id,
    expectedUpdatedAt,
    data: fields as Parameters<typeof updateLaunchReviewContent>[0]["data"],
    actorUserId: options.actor.userId,
  });

  return getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function completeMorningLaunchReview(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayLaunchReviewViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();

  if (options.body && typeof options.body === "object") {
    await patchCampaignDayLaunchReview({
      dateKey: options.dateKey,
      actor: options.actor,
      body: options.body,
      now,
    });
  }

  const model = await getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
  if (model.launchReview.status === "LAUNCHED") {
    throw new ValidationError("Launched days cannot be re-reviewed casually.");
  }
  if (model.reviewBlockers.length > 0) {
    throw new ValidationError(model.reviewBlockers[0]);
  }

  const launch = await findLaunchReviewByDateKey(options.dateKey);
  if (!launch) throw new NotFoundError("Launch Review not found.");

  const bodyObj =
    options.body && typeof options.body === "object"
      ? (options.body as { expectedUpdatedAt?: string })
      : {};

  await updateLaunchReviewContent({
    launchReviewId: launch.id,
    expectedUpdatedAt: bodyObj.expectedUpdatedAt ?? launch.updatedAt,
    data: {
      status: "REVIEWED",
      reviewedAt: now,
      reviewedByUserId: options.actor.userId,
    },
    actorUserId: options.actor.userId,
  });

  return getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function launchCampaignDay(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayLaunchReviewViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const model = await getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });

  if (model.launchBlockers.length > 0) {
    throw new ValidationError(model.launchBlockers[0]);
  }
  if (model.launchReview.status !== "REVIEWED") {
    throw new ValidationError("Morning review must be completed before launch.");
  }

  const bodyObj =
    options.body && typeof options.body === "object"
      ? (options.body as { expectedUpdatedAt?: string; confirm?: boolean })
      : {};
  if (bodyObj.confirm !== true) {
    throw new ValidationError(
      "Launch requires explicit confirmation (confirm: true).",
    );
  }

  const launch = await findLaunchReviewByDateKey(options.dateKey);
  if (!launch) throw new NotFoundError("Launch Review not found.");

  await updateLaunchReviewContent({
    launchReviewId: launch.id,
    expectedUpdatedAt: bodyObj.expectedUpdatedAt ?? launch.updatedAt,
    data: {
      status: "LAUNCHED",
      launchedAt: now,
      launchedByUserId: options.actor.userId,
    },
    actorUserId: options.actor.userId,
  });

  return getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}

export async function addLaunchAcknowledgements(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<{
  model: CampaignDayLaunchReviewViewModel;
  added: number;
  alreadyPresent: number;
}> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertLaunchDateInRange(options.dateKey, now, campaignTimezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const items = Array.isArray((options.body as { items?: unknown })?.items)
    ? ((options.body as { items: unknown[] }).items)
    : [options.body];

  const launch = await ensureLaunchReviewStarted({
    campaignDateKey: options.dateKey,
    actorUserId: options.actor.userId,
    now,
  });
  if (launch.status === "LAUNCHED") {
    throw new ValidationError("Cannot add acknowledgements to a launched day.");
  }

  let added = 0;
  let alreadyPresent = 0;

  for (const raw of items) {
    const validated = validateAcknowledgementCreate(raw);
    if (!validated.ok) throw new ValidationError(validated.error);
    const p = validated.patch as {
      acknowledgementType: CampaignDayLaunchAcknowledgementType;
      sourceType: CampaignDayLaunchSourceType;
      sourceRecordId: string | null;
      missionId: string | null;
      title: string;
      importKeyHint: string | null;
      clientKey: string | null;
      status: CampaignDayLaunchAcknowledgementStatus;
      acknowledgementNote: string | null;
      acceptedRiskReason: string | null;
    };

    if (p.status === "ACCEPTED_RISK" && !p.acceptedRiskReason) {
      throw new ValidationError(
        "acceptedRiskReason is required when accepting risk.",
      );
    }

    const importKey =
      p.importKeyHint ??
      acknowledgementImportKey(
        p.acknowledgementType,
        p.sourceType,
        p.sourceRecordId ??
          p.clientKey ??
          p.missionId ??
          `op:${p.title}`,
      );

    const result = await upsertLaunchAcknowledgement({
      launchReviewId: launch.id,
      acknowledgementType: p.acknowledgementType,
      sourceType: p.sourceType,
      sourceRecordId: p.sourceRecordId,
      importKey,
      missionId: p.missionId,
      title: p.title,
      status: p.status,
      acknowledgementNote: p.acknowledgementNote,
      acceptedRiskReason: p.acceptedRiskReason,
      actorUserId: options.actor.userId,
      now,
    });
    if (result.created) added += 1;
    else alreadyPresent += 1;
  }

  const model = await getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
  return { model, added, alreadyPresent };
}

export async function patchLaunchAcknowledgement(options: {
  dateKey: string;
  acknowledgementId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<CampaignDayLaunchReviewViewModel> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const launch = await findLaunchReviewByDateKey(options.dateKey);
  if (!launch) throw new NotFoundError("Launch Review not found.");
  if (launch.status === "LAUNCHED") {
    throw new ValidationError(
      "Cannot update acknowledgements on a launched day.",
    );
  }
  const item = launch.acknowledgements.find(
    (a) => a.id === options.acknowledgementId,
  );
  if (!item) throw new NotFoundError("Acknowledgement not found.");

  const validated = validateAcknowledgementPatch(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const p = validated.patch as {
    status?: CampaignDayLaunchAcknowledgementStatus;
    acknowledgementNote?: string | null;
    acceptedRiskReason?: string | null;
  };

  await updateLaunchAcknowledgement({
    acknowledgementId: options.acknowledgementId,
    data: {
      ...p,
      acknowledgedAt: now,
      acknowledgedByUserId: options.actor.userId,
    },
  });

  return getCampaignDayLaunchReview({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}
