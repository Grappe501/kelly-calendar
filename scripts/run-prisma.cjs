#!/usr/bin/env node
/**
 * Prisma CLI with Kelly/RedDirt env loading (DATABASE_URL / DIRECT_URL).
 * Never prints connection strings.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function main() {
  const { loadApprovedEnv } = await import(
    pathToFileURL(path.join(__dirname, "lib/load-env-files.mjs")).href
  );
  const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });

  const env = { ...process.env };
  if (loaded.DATABASE_URL && !env.DATABASE_URL) env.DATABASE_URL = loaded.DATABASE_URL;
  if (loaded.DIRECT_URL && !env.DIRECT_URL) env.DIRECT_URL = loaded.DIRECT_URL;
  if (!env.DIRECT_URL && env.DATABASE_URL) env.DIRECT_URL = env.DATABASE_URL;

  // H-drive cache pins for local Windows
  const workspaceRoot = path.resolve(__dirname, "..", "..");
  const cacheRoot = path.join(workspaceRoot, ".cache");
  const tempDir = path.join(cacheRoot, "temp");
  fs.mkdirSync(tempDir, { recursive: true });
  env.TEMP = tempDir;
  env.TMP = tempDir;

  const args = process.argv.slice(2);
  if (!args.length) {
    console.error("Usage: node scripts/run-prisma.cjs <prisma-args>");
    process.exit(1);
  }

  const prismaCli = path.join(
    __dirname,
    "..",
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );

  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error("Prisma wrapper failed");
  console.error(error?.message || error);
  process.exit(1);
});
