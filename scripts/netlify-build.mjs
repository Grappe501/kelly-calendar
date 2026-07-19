#!/usr/bin/env node
/**
 * Netlify-only build entry.
 * Do not run npm ci here — Netlify already installs from the lockfile.
 * Local H: cache paths must not apply; netlify.toml sets NPM_CONFIG_CACHE.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, args) {
  console.log(`KCCC Netlify build: ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.NODE_OPTIONS?.includes("max-old-space-size")) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--max-old-space-size=4096"]
    .filter(Boolean)
    .join(" ");
}

run("prisma generate", [
  path.join(root, "node_modules", "prisma", "build", "index.js"),
  "generate",
]);

run("next build", [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"]);

console.log("KCCC Netlify build: complete");
