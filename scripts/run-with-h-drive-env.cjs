#!/usr/bin/env node
/**
 * Kelly Calendar — H: drive environment wrapper.
 * Pins TEMP/TMP, npm cache, and Playwright browsers to H:\SOSWebsite\.cache\ on Windows local dev.
 *
 * Usage: node scripts/run-with-h-drive-env.cjs <command> [args...]
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(repoRoot, "..");
const cacheRoot = path.join(workspaceRoot, ".cache");
const tempDir = path.join(cacheRoot, "temp");
const npmCache = path.join(cacheRoot, "npm");
const playwrightDir = path.join(cacheRoot, "playwright");
const nextCache = path.join(cacheRoot, "next");
const prismaCache = path.join(cacheRoot, "prisma");

for (const dir of [cacheRoot, tempDir, npmCache, playwrightDir, nextCache, prismaCache]) {
  fs.mkdirSync(dir, { recursive: true });
}

/** CI/Netlify uses platform temp — do not pin H: paths in cloud builds. */
const isCiBuild = Boolean(
  process.env.NETLIFY ||
    process.env.NETLIFY_BUILD_BASE ||
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION,
);

const localBin = path.join(repoRoot, "node_modules", ".bin");

const env = {
  ...process.env,
  TEMP: isCiBuild ? process.env.TEMP : tempDir,
  TMP: isCiBuild ? process.env.TMP : tempDir,
  TMPDIR: isCiBuild ? process.env.TMPDIR : tempDir,
};

if (!env.NODE_OPTIONS?.includes("max-old-space-size")) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, "--max-old-space-size=4096"].filter(Boolean).join(" ");
}

const pathParts = [localBin];
if (!isCiBuild && process.platform === "win32") {
  env.npm_config_cache = npmCache;
  env.PLAYWRIGHT_BROWSERS_PATH = playwrightDir;
  env.NEXT_CACHE_DIR = nextCache;
  pathParts.push(
    ...[
      path.dirname(process.execPath),
      "C:\\Program Files\\nodejs",
    ].filter((d, i, a) => d && a.indexOf(d) === i && fs.existsSync(d)),
  );
}
env.PATH = `${pathParts.join(path.delimiter)}${path.delimiter}${env.PATH ?? ""}`;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/run-with-h-drive-env.cjs <command> [args...]");
  process.exit(1);
}

const [command, ...rest] = args;
const result = spawnSync(command, rest, {
  cwd: repoRoot,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
