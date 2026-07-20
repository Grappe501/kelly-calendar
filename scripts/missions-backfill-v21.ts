/**
 * V2.1 Mission backfill — Event → CampaignMission.
 *
 * Default: dry-run (no writes).
 * Apply: --apply (requires KCCC_ALLOW_MISSION_BACKFILL=1)
 */
import {
  projectEventToMission,
  validateCampaignMission,
} from "../src/lib/missions/v21";
import { prisma } from "../src/server/db/prisma";
import { upsertCampaignMissionFromProjection } from "../src/server/repositories/mission-repository";

async function main() {
  const apply = process.argv.includes("--apply");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;

  if (apply && process.env.KCCC_ALLOW_MISSION_BACKFILL !== "1") {
    console.error(
      "BLOCKED: Set KCCC_ALLOW_MISSION_BACKFILL=1 after reviewing dry-run output.",
    );
    process.exit(1);
  }

  const events = await prisma.event.findMany({
    where: { archivedAt: null },
    take: Number.isFinite(limit) ? limit : 500,
    orderBy: { startsAt: "asc" },
    include: {
      county: true,
      region: true,
      objectives: true,
      outcomes: true,
      followups: true,
      travelPlans: true,
      eventOrganizations: { include: { organization: true } },
      eventPeople: { include: { person: true } },
    },
  });

  let ok = 0;
  let warnings = 0;
  let failed = 0;
  let written = 0;

  for (const event of events) {
    const source = {
      id: event.id,
      eventNumber: event.eventNumber,
      version: event.version,
      internalTitle: event.internalTitle,
      campaignDisplayTitle: event.campaignDisplayTitle,
      eventType: event.eventType,
      eventSubtype: event.eventSubtype,
      status: event.status,
      priority: event.priority,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      city: event.city,
      countyName: event.county?.name ?? null,
      regionName: event.region?.name ?? null,
      venueName: event.venueName,
      expectedAttendance: event.expectedAttendance,
      candidateRole: event.candidateRole,
      objectives: event.objectives.map((o) => ({
        isPrimary: o.isPrimary,
        objectiveType: String(o.objectiveType),
        description: o.description,
        successDefinition: o.successDefinition,
        targetAudience: o.targetAudience,
        desiredOutcome: o.desiredOutcome,
        priority: o.priority,
      })),
      organizations: event.eventOrganizations.map((eo) => ({
        name: eo.organization.name,
        organizationType: eo.organization.organizationType,
        role: eo.role,
      })),
      people: event.eventPeople.map((ep) => ({
        displayName: ep.person.displayName,
        role: String(ep.role),
        title: ep.person.title,
      })),
      followupCount: event.followups.length,
      hasOutcome: event.outcomes.length > 0,
      travelRequired: event.travelPlans.some((t) => t.travelRequired),
    };

    const mission = projectEventToMission(source);
    const validation = validateCampaignMission(mission);
    if (!validation.ok) {
      failed += 1;
      console.log(
        "FAIL",
        event.eventNumber,
        validation.issues
          .filter((i) => i.severity === "error")
          .map((i) => i.code)
          .join(","),
      );
      continue;
    }
    ok += 1;
    warnings += validation.issues.filter((i) => i.severity === "warning").length;
    if (apply) {
      await upsertCampaignMissionFromProjection(mission);
      written += 1;
    }
  }

  console.log(`Mode ......................... ${apply ? "APPLY" : "DRY_RUN"}`);
  console.log(`Events scanned ............... ${events.length}`);
  console.log(`Valid projections ............ ${ok}`);
  console.log(`Failed projections ........... ${failed}`);
  console.log(`Warning count ................ ${warnings}`);
  console.log(`Mission rows written ......... ${written}`);
  console.log("Event scheduling mutated ..... NO");

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error("Backfill failed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
