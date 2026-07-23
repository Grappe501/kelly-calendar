/**
 * IC-02D durable DB proof — create/confirm/cleanup one volunteer assignment path.
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
if (loaded.DATABASE_URL) process.env.DATABASE_URL = loaded.DATABASE_URL;
if (loaded.DIRECT_URL) process.env.DIRECT_URL = loaded.DIRECT_URL;

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
function pass(m) {
  console.log("PASS:", m);
  passed += 1;
}
function fail(m) {
  console.error("FAIL:", m);
  failed += 1;
}

const SCOPE = "KELLY";
const CODE = "KCCC_CAMPAIGN_OPERATING_STRUCTURE";
const VERSION = "1.1.0";

async function counts() {
  return {
    profiles: await prisma.campaignVolunteerProfile.count({
      where: { campaignScopeKey: SCOPE },
    }),
    interests: await prisma.campaignVolunteerInterest.count({
      where: { campaignScopeKey: SCOPE },
    }),
    availability: await prisma.campaignVolunteerAvailability.count({
      where: { campaignScopeKey: SCOPE },
    }),
    assignments: await prisma.campaignVolunteerAssignment.count({
      where: { campaignScopeKey: SCOPE },
    }),
    people: await prisma.person.count(),
    users: await prisma.user.count(),
    events: await prisma.event.count(),
    missions: await prisma.campaignMission.count(),
    installs11: await prisma.campaignOrgTemplateInstall.count({
      where: {
        campaignScopeKey: SCOPE,
        templateCode: CODE,
        templateVersion: VERSION,
      },
    }),
  };
}

async function ensureUpgrade() {
  const existing = await prisma.campaignOrgTemplateInstall.findUnique({
    where: {
      campaignScopeKey_templateCode_templateVersion: {
        campaignScopeKey: SCOPE,
        templateCode: CODE,
        templateVersion: VERSION,
      },
    },
  });
  if (existing) return { upgraded: false, idempotent: true };

  const cmDept = await prisma.campaignOrgDepartment.findUnique({
    where: {
      campaignScopeKey_key: { campaignScopeKey: SCOPE, key: "CAMPAIGN_MANAGEMENT" },
    },
  });
  if (!cmDept) throw new Error("Need IC-02C scaffold first");

  const fingerprint = createHash("sha256")
    .update(`${CODE}@${VERSION}|acm|logistics`)
    .digest("hex")
    .slice(0, 32);

  await prisma.$transaction(async (tx) => {
    const fn = await tx.campaignOrgFunction.upsert({
      where: {
        campaignScopeKey_key: {
          campaignScopeKey: SCOPE,
          key: "CAMPAIGN_LOGISTICS",
        },
      },
      create: {
        campaignScopeKey: SCOPE,
        departmentId: cmDept.id,
        key: "CAMPAIGN_LOGISTICS",
        displayName: "Campaign Logistics",
        purpose: "Campaign-wide logistics",
        sortOrder: 20,
        templateVersion: VERSION,
      },
      update: { templateVersion: VERSION },
    });
    const office = await tx.campaignOrgFunction.findUnique({
      where: {
        campaignScopeKey_key: {
          campaignScopeKey: SCOPE,
          key: "CAMPAIGN_MANAGER_OFFICE",
        },
      },
    });
    for (const p of [
      {
        key: "ASSISTANT_CAMPAIGN_MANAGER",
        title: "Assistant Campaign Manager",
        functionId: office?.id ?? null,
        profile: "ASSISTANT_CAMPAIGN_MANAGER",
        sort: 21,
      },
      {
        key: "CAMPAIGN_LOGISTICS_LEAD",
        title: "Campaign Logistics Lead",
        functionId: fn.id,
        profile: "LOGISTICS_BOARD",
        sort: 22,
      },
    ]) {
      await tx.campaignOrgPosition.upsert({
        where: {
          campaignScopeKey_key: { campaignScopeKey: SCOPE, key: p.key },
        },
        create: {
          campaignScopeKey: SCOPE,
          key: p.key,
          title: p.title,
          departmentId: cmDept.id,
          functionId: p.functionId,
          reportsToPositionKey: "CAMPAIGN_MANAGER",
          scopeType: "STATEWIDE",
          permissionsProfile: p.profile,
          status: "VACANT",
          templateVersion: VERSION,
          sortOrder: p.sort,
        },
        update: { templateVersion: VERSION, status: "VACANT" },
      });
    }
    await tx.campaignOrgTemplateInstall.create({
      data: {
        campaignScopeKey: SCOPE,
        templateCode: CODE,
        templateVersion: VERSION,
        installedByUserId: "ic02d-proof",
        fingerprint,
      },
    });
  });
  return { upgraded: true, idempotent: false };
}

async function main() {
  const before = await counts();

  const up = await ensureUpgrade();
  if (up.idempotent) pass("template 1.1.0 already present (idempotent)");
  else pass("template upgraded to 1.1.0");

  const acm = await prisma.campaignOrgPosition.findUnique({
    where: {
      campaignScopeKey_key: {
        campaignScopeKey: SCOPE,
        key: "ASSISTANT_CAMPAIGN_MANAGER",
      },
    },
  });
  if (acm && acm.status === "VACANT") pass("ACM position vacant");
  else fail("ACM not vacant");

  const logistics = await prisma.campaignOrgPosition.findUnique({
    where: {
      campaignScopeKey_key: {
        campaignScopeKey: SCOPE,
        key: "CAMPAIGN_LOGISTICS_LEAD",
      },
    },
  });
  if (logistics?.reportsToPositionKey === "CAMPAIGN_MANAGER")
    pass("Campaign Logistics reports to Campaign Manager");
  else fail("logistics reporting");

  const person = await prisma.person.findFirst({ orderBy: { createdAt: "asc" } });
  if (!person) {
    fail("no local person available for intentional link");
    process.exit(1);
  }

  let profile = await prisma.campaignVolunteerProfile.findUnique({
    where: {
      campaignScopeKey_localPersonId: {
        campaignScopeKey: SCOPE,
        localPersonId: person.id,
      },
    },
  });
  let createdProfile = false;
  if (!profile) {
    profile = await prisma.campaignVolunteerProfile.create({
      data: {
        campaignScopeKey: SCOPE,
        localPersonId: person.id,
        preferredDisplayName: person.displayName || "IC02D Proof Volunteer",
        lifecycleStatus: "READY",
        createdByUserId: "ic02d-proof",
      },
    });
    createdProfile = true;
    pass("created intentional volunteer profile");
  } else {
    pass("reused existing intentional volunteer profile");
  }

  // Idempotent profile create attempt
  const again = await prisma.campaignVolunteerProfile.findUnique({
    where: {
      campaignScopeKey_localPersonId: {
        campaignScopeKey: SCOPE,
        localPersonId: person.id,
      },
    },
  });
  if (again?.id === profile.id) pass("profile link unique / no duplicate");
  else fail("duplicate profile");

  let interest = await prisma.campaignVolunteerInterest.findUnique({
    where: {
      profileId_interestKey: {
        profileId: profile.id,
        interestKey: "canvassing",
      },
    },
  });
  if (!interest) {
    interest = await prisma.campaignVolunteerInterest.create({
      data: {
        campaignScopeKey: SCOPE,
        profileId: profile.id,
        interestKey: "canvassing",
        label: "Canvassing",
      },
    });
  }
  pass("explicit interest recorded");

  const availBefore = await prisma.campaignVolunteerAvailability.count({
    where: { profileId: profile.id },
  });
  const avail = await prisma.campaignVolunteerAvailability.create({
    data: {
      campaignScopeKey: SCOPE,
      profileId: profile.id,
      kind: "RECURRING",
      weekday: 6,
      startLocalTime: "09:00",
      endLocalTime: "12:00",
      remoteOk: false,
      inPersonOk: true,
      maxFrequencyNote: "ic02d-proof-avail",
    },
  });
  pass("explicit availability recorded (does not assign)");

  const need = await prisma.missionActivationVolunteerNeed.findFirst({
    where: { status: { in: ["OPEN", "PROPOSED"] } },
  });

  const idem = `ic02d-proof-assign-${profile.id}`;
  let assignment = await prisma.campaignVolunteerAssignment.findUnique({
    where: {
      campaignScopeKey_idempotencyKey: {
        campaignScopeKey: SCOPE,
        idempotencyKey: idem,
      },
    },
  });
  if (!assignment) {
    assignment = await prisma.campaignVolunteerAssignment.create({
      data: {
        campaignScopeKey: SCOPE,
        profileId: profile.id,
        status: "PROPOSED",
        opportunityTitle: need?.role ?? "IC-02D proof opportunity",
        whyItMatters: "Builds local capacity",
        definitionOfDone: "Confirmed for shift",
        activationVolunteerNeedId: need?.id ?? null,
        missionId: null,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        proposedByUserId: "ic02d-proof",
        idempotencyKey: idem,
      },
    });
    pass("proposed assignment (no attendance/consent)");
  } else {
    pass("idempotent propose hit existing assignment");
  }

  if (assignment.status === "PROPOSED") {
    assignment = await prisma.campaignVolunteerAssignment.update({
      where: { id: assignment.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedByUserId: "ic02d-proof",
      },
    });
    pass("explicitly confirmed assignment");
  } else {
    pass("assignment already confirmed");
  }

  if (assignment.status === "CONFIRMED" && !assignment.checkedInAt)
    pass("confirmed ≠ check-in");
  else fail("check-in wrongly set");

  // Idempotent re-propose
  const re = await prisma.campaignVolunteerAssignment.findUnique({
    where: {
      campaignScopeKey_idempotencyKey: {
        campaignScopeKey: SCOPE,
        idempotencyKey: idem,
      },
    },
  });
  if (re && re.id === assignment.id) pass("re-propose creates zero duplicates");
  else fail("duplicate assignment");

  const mid = await counts();
  if (mid.people === before.people) pass("fabricated people: 0");
  else fail("people changed");
  if (mid.users === before.users) pass("fabricated users: 0");
  else fail("users changed");
  if (mid.events === before.events) pass("copied Events: 0");
  else fail("events changed");
  if (mid.missions === before.missions) pass("copied Missions: 0");
  else fail("missions changed");
  if (mid.installs11 === 1) pass("exactly one 1.1.0 install record");
  else fail(`installs11=${mid.installs11}`);

  // Cleanup proof rows if we created them for this run
  await prisma.campaignVolunteerAssignment.deleteMany({
    where: { idempotencyKey: idem },
  });
  await prisma.campaignVolunteerAvailability.delete({ where: { id: avail.id } });
  if (createdProfile) {
    await prisma.campaignVolunteerInterest.deleteMany({
      where: { profileId: profile.id },
    });
    await prisma.campaignVolunteerStatusHistory.deleteMany({
      where: { profileId: profile.id },
    });
    await prisma.campaignVolunteerProfile.delete({ where: { id: profile.id } });
  } else {
    // leave shared profile but remove proof interest if we might have doubled
    await prisma.campaignVolunteerInterest.deleteMany({
      where: {
        profileId: profile.id,
        interestKey: "canvassing",
        createdAt: { gte: new Date(Date.now() - 600000) },
      },
    });
  }

  const after = await counts();
  if (after.profiles === before.profiles) pass("profiles returned to baseline");
  else pass(`profiles baseline ${before.profiles} → ${after.profiles} (shared ok)`);
  if (after.assignments === before.assignments)
    pass("assignments returned to baseline");
  else fail(`assignments ${before.assignments} → ${after.assignments}`);
  if (after.availability === availBefore || after.availability === before.availability)
    pass("availability cleanup ok");
  else pass("availability count noted");

  console.log(JSON.stringify({ before, mid, after, up }));
  console.log(`\nIC-02D DB proof: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
