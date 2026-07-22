/**
 * Cancel the multi-day Benton Immersion Week umbrella so day + JP evening
 * events remain the visible schedule (umbrella blanketed the whole week).
 *
 * Usage: node scripts/run-with-h-drive-env.cjs node scripts/cancel-benton-umbrella.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "BENTON-UMBRELLA-CANCEL-2026-07-21";
const UMBRELLA_KEY = "nwa-immersion-tour-2026-08-17";

spawnSync(process.execPath, ["scripts/ensure-app-session-secret.mjs"], {
  cwd: root,
  stdio: "inherit",
});

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  if (loaded[key] && !process.env[key]) process.env[key] = loaded[key];
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const umbrella = await prisma.event.findFirst({
    where: { privateNotes: { startsWith: `[ingestKey:${UMBRELLA_KEY}]` } },
  });
  if (!umbrella) {
    console.log("No umbrella found");
    process.exit(0);
  }
  if (umbrella.status === "CANCELLED") {
    console.log(`Already cancelled: ${umbrella.eventNumber}`);
  } else {
    await prisma.event.update({
      where: { id: umbrella.id },
      data: {
        status: "CANCELLED",
        privateNotes: `${umbrella.privateNotes ?? ""}\n[CANCELLED:${PASS}] Multi-day umbrella removed from calendar display. Daytime immersion + JP district evenings remain the live schedule.`,
        version: { increment: 1 },
      },
    });
    console.log(`CANCELLED umbrella ${umbrella.eventNumber}`);
  }

  const proof = {
    pass: PASS,
    cancelledUmbrella: umbrella.eventNumber,
    remainsVisible:
      "benton-immersion-day-* + benton-jp-district-evening-* + travel in/out",
  };
  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "benton-umbrella-cancel-latest.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  console.log("PASS");
} finally {
  await prisma.$disconnect();
}
