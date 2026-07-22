/**
 * Upsert one operator login (email + password + role) into kelly_calendar.User.
 *
 * Required env:
 *   KCCC_OPERATOR_EMAIL
 *   KCCC_OPERATOR_PASSWORD  (min 8 chars; never commit / never log)
 * Optional:
 *   KCCC_OPERATOR_DISPLAY_NAME
 *   KCCC_OPERATOR_ROLE  (default KELLY)
 *   KCCC_OPERATOR_ROLE_LABEL  (team membership label; defaults to role)
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
  process.env.KCCC_OPERATOR_DISPLAY_NAME || email,
).trim();
const systemRole = String(process.env.KCCC_OPERATOR_ROLE || "KELLY")
  .trim()
  .toUpperCase();
const roleLabel = String(
  process.env.KCCC_OPERATOR_ROLE_LABEL || systemRole,
).trim();

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

  const useFieldOps =
    systemRole === "STAFF" ||
    systemRole === "SCHEDULER" ||
    systemRole === "VOLUNTEER";
  const teamSlug = useFieldOps ? "field-ops" : "campaign-leadership";
  const teamName = useFieldOps ? "Field Operations" : "Campaign Leadership";
  const team = await prisma.team.upsert({
    where: { slug: teamSlug },
    update: { name: teamName, isActive: true },
    create: {
      slug: teamSlug,
      name: teamName,
      description: useFieldOps
        ? "Field and volunteer operations"
        : "Campaign leadership team",
    },
  });

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: { isActive: true, roleLabel },
    create: {
      teamId: team.id,
      userId: user.id,
      roleLabel,
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
        roleLabel,
        isActive: user.isActive,
        team: teamSlug,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
