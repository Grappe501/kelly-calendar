/**
 * Idempotent synthetic auth seed for Step 4.
 * No real candidate PII. Passwords come from KCCC_SEED_PASSWORD or a local default.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scryptSync, randomBytes } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

spawnSync(process.execPath, ["scripts/ensure-app-session-secret.mjs"], {
  cwd: root,
  stdio: "inherit",
});
spawnSync(process.execPath, ["scripts/run-prisma.cjs", "generate"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
for (const key of ["DATABASE_URL", "DIRECT_URL", "APP_SESSION_SECRET"]) {
  if (loaded[key] && !process.env[key]) process.env[key] = loaded[key];
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const seedPassword =
  process.env.KCCC_SEED_PASSWORD?.trim() ||
  "KcccDevOnly-ChangeMe-Step4!";

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const USERS = [
  {
    email: "kelly.command@example.invalid",
    displayName: "Kelly (Synthetic)",
    systemRole: "KELLY",
  },
  {
    email: "campaign.manager@example.invalid",
    displayName: "Campaign Manager (Synthetic)",
    systemRole: "CAMPAIGN_MANAGER",
  },
  {
    email: "scheduler@example.invalid",
    displayName: "Scheduler (Synthetic)",
    systemRole: "SCHEDULER",
  },
  {
    email: "staff@example.invalid",
    displayName: "Staff (Synthetic)",
    systemRole: "STAFF",
  },
  {
    email: "advisor@example.invalid",
    displayName: "Read-Only Advisor (Synthetic)",
    systemRole: "READ_ONLY_ADVISOR",
  },
];

const passwordHash = hashPassword(seedPassword);

try {
  const leadership = await prisma.team.upsert({
    where: { slug: "campaign-leadership" },
    update: { name: "Campaign Leadership", isActive: true },
    create: {
      slug: "campaign-leadership",
      name: "Campaign Leadership",
      description: "Synthetic leadership team for Step 4 RBAC tests",
    },
  });

  const field = await prisma.team.upsert({
    where: { slug: "field-ops" },
    update: { name: "Field Operations", isActive: true },
    create: {
      slug: "field-ops",
      name: "Field Operations",
      description: "Synthetic field team",
    },
  });

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        systemRole: u.systemRole,
        passwordHash,
        isActive: true,
      },
      create: {
        email: u.email,
        displayName: u.displayName,
        systemRole: u.systemRole,
        passwordHash,
        isActive: true,
        mustResetPassword: true,
      },
    });

    const teamId =
      u.systemRole === "STAFF" || u.systemRole === "SCHEDULER"
        ? field.id
        : leadership.id;

    await prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId, userId: user.id } },
      update: { isActive: true },
      create: {
        teamId,
        userId: user.id,
        roleLabel: u.systemRole,
        isActive: true,
      },
    });
  }

  // Grant staff VIEW_LIMITED on public-events if calendar exists
  const publicCal = await prisma.calendar.findFirst({
    where: { slug: "public-events" },
    select: { id: true },
  });
  const staffUser = await prisma.user.findUnique({
    where: { email: "staff@example.invalid" },
  });
  if (publicCal && staffUser) {
    const existing = await prisma.calendarMembership.findFirst({
      where: { calendarId: publicCal.id, userId: staffUser.id, revokedAt: null },
    });
    if (!existing) {
      await prisma.calendarMembership.create({
        data: {
          calendarId: publicCal.id,
          userId: staffUser.id,
          accessLevel: "VIEW_FULL",
          canViewParticipants: true,
          grantReason: "Step 4 synthetic seed",
        },
      });
    }
  }

  console.log("PASS: seeded synthetic auth users and teams");
  console.log("PASS: emails use @example.invalid (no real PII)");
  console.log(
    "NOTE: password is KCCC_SEED_PASSWORD or default local seed (not printed)",
  );
} finally {
  await prisma.$disconnect();
}
