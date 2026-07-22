/**
 * Upsert one operator login (email + password + role) into kelly_calendar.User.
 *
 * Required env:
 *   KCCC_OPERATOR_EMAIL
 *   KCCC_OPERATOR_PASSWORD  (min 8 chars; never commit / never log)
 * Optional:
 *   KCCC_OPERATOR_DISPLAY_NAME
 *   KCCC_OPERATOR_ROLE  (default KELLY)
 *
 * Loads DATABASE_URL via approved env loaders (.env.local / RedDirt fallback).
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ROLES = new Set([
  "KELLY",
  "CAMPAIGN_MANAGER",
  "SCHEDULER",
  "STAFF",
  "VOLUNTEER",
  "READ_ONLY_ADVISOR",
  "SYSTEM_AI",
]);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

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
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (set in .env.local)");
}

const email = String(process.env.KCCC_OPERATOR_EMAIL || "")
  .trim()
  .toLowerCase();
const password = String(process.env.KCCC_OPERATOR_PASSWORD || "");
const displayName = String(
  process.env.KCCC_OPERATOR_DISPLAY_NAME || "Kelly Grappe",
).trim();
const systemRole = String(process.env.KCCC_OPERATOR_ROLE || "KELLY")
  .trim()
  .toUpperCase();

if (!email || !email.includes("@")) {
  throw new Error("KCCC_OPERATOR_EMAIL is required");
}
if (password.length < 8) {
  throw new Error("KCCC_OPERATOR_PASSWORD must be at least 8 characters");
}
if (!ROLES.has(systemRole)) {
  throw new Error(`Invalid KCCC_OPERATOR_ROLE: ${systemRole}`);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const passwordHash = hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName,
      systemRole,
      passwordHash,
      isActive: true,
      mustResetPassword: false,
    },
    update: {
      displayName,
      systemRole,
      passwordHash,
      isActive: true,
      mustResetPassword: false,
    },
  });

  const leadership = await prisma.team.upsert({
    where: { slug: "campaign-leadership" },
    update: { name: "Campaign Leadership", isActive: true },
    create: {
      slug: "campaign-leadership",
      name: "Campaign Leadership",
      description: "Campaign leadership team",
    },
  });

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: leadership.id, userId: user.id } },
    update: { isActive: true, roleLabel: systemRole },
    create: {
      teamId: leadership.id,
      userId: user.id,
      roleLabel: systemRole,
      isActive: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: existing ? "updated" : "created",
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        systemRole: user.systemRole,
        isActive: user.isActive,
        team: "campaign-leadership",
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
