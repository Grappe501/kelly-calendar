/**
 * Pilot-blocker: reset/create operator password in kelly_calendar."User".
 * Reads credentials only from env. Never prints password or hash.
 *
 * Required env:
 *   KCCC_RESET_EMAIL
 *   KCCC_RESET_PASSWORD  (min 8 chars)
 *
 * Optional:
 *   KCCC_RESET_DISPLAY_NAME (default: Operator)
 *   KCCC_RESET_ROLE (default: CAMPAIGN_MANAGER)
 */
const { spawnSync } = require("node:child_process");
const { scryptSync, randomBytes } = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function redactEmail(email) {
  const [local, domain] = String(email).split("@");
  if (!domain) return "(invalid)";
  const keep = local.slice(0, 2);
  return `${keep}***@${domain}`;
}

async function main() {
  const emailRaw = process.env.KCCC_RESET_EMAIL?.trim();
  const password = process.env.KCCC_RESET_PASSWORD ?? "";
  const displayName =
    process.env.KCCC_RESET_DISPLAY_NAME?.trim() || "Campaign Operator";
  const systemRole = process.env.KCCC_RESET_ROLE?.trim() || "CAMPAIGN_MANAGER";

  if (!emailRaw || !emailRaw.includes("@")) {
    console.error("FAIL: KCCC_RESET_EMAIL missing or invalid");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("FAIL: KCCC_RESET_PASSWORD missing or too short");
    process.exit(1);
  }

  spawnSync(process.execPath, ["scripts/run-prisma.cjs", "generate"], {
    cwd: root,
    stdio: "ignore",
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
    console.error("FAIL: DATABASE_URL not available");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const email = emailRaw.toLowerCase();
  const passwordHash = hashPassword(password);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        isActive: true,
        systemRole,
        displayName: existing?.displayName || displayName,
        mustResetPassword: false,
      },
      create: {
        email,
        displayName,
        systemRole,
        passwordHash,
        isActive: true,
        mustResetPassword: false,
      },
      select: { id: true, email: true, systemRole: true, isActive: true },
    });

    const revoked = await prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Ensure leadership team membership for owner-like roles.
    if (systemRole === "CAMPAIGN_MANAGER" || systemRole === "KELLY") {
      const team = await prisma.team.upsert({
        where: { slug: "campaign-leadership" },
        update: { isActive: true },
        create: {
          slug: "campaign-leadership",
          name: "Campaign Leadership",
          description: "Campaign leadership team",
        },
      });
      await prisma.teamMembership.upsert({
        where: {
          teamId_userId: { teamId: team.id, userId: user.id },
        },
        update: { roleLabel: "OWNER", isActive: true },
        create: {
          teamId: team.id,
          userId: user.id,
          roleLabel: "OWNER",
          isActive: true,
        },
      });

      const calendars = await prisma.calendar.findMany({
        where: { archivedAt: null },
        select: { id: true },
        take: 50,
      });
      let membershipCount = 0;
      for (const cal of calendars) {
        const existingMembership = await prisma.calendarMembership.findFirst({
          where: {
            calendarId: cal.id,
            userId: user.id,
            revokedAt: null,
          },
        });
        if (existingMembership) {
          await prisma.calendarMembership.update({
            where: { id: existingMembership.id },
            data: {
              accessLevel: "ADMINISTER",
              canCreateEvents: true,
              canEditEvents: true,
              canArchiveEvents: true,
              canManageMemberships: true,
            },
          });
        } else {
          await prisma.calendarMembership.create({
            data: {
              calendarId: cal.id,
              userId: user.id,
              accessLevel: "ADMINISTER",
              canCreateEvents: true,
              canEditEvents: true,
              canArchiveEvents: true,
              canManageMemberships: true,
              grantReason: "pilot_operator_reset",
            },
          });
        }
        membershipCount += 1;
      }
      console.log(`calendars_admin ...... ${membershipCount}`);
    }

    console.log(`user .................. ${redactEmail(user.email)}`);
    console.log(`role .................. ${user.systemRole}`);
    console.log(`active ................ ${user.isActive ? "yes" : "no"}`);
    console.log(`password .............. RESET`);
    console.log(`sessions_revoked ...... ${revoked.count}`);
    console.log("OPENAI/DB secrets ..... not printed");
    process.exit(0);
  } catch (err) {
    console.error("FAIL:", err?.code || err?.message || "unknown");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
