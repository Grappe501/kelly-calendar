#!/usr/bin/env node
/**
 * Netlify-only build entry.
 * Do not run npm ci here — Netlify already installs from the lockfile.
 * Local H: cache paths must not apply; netlify.toml sets NPM_CONFIG_CACHE.
 *
 * When `netlify deploy --build` runs on Windows, Prisma must still emit a
 * Linux query engine (rhel-openssl-3.0.x) for Netlify Functions.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

{
  const clientDir = path.join(root, "node_modules", ".prisma", "client");
  const engines = fs.existsSync(clientDir)
    ? fs.readdirSync(clientDir).filter((f) => f.includes("query_engine") || f.includes("libquery"))
    : [];
  const hasLinux = engines.some(
    (f) => f.includes("rhel") || f.includes("linux") || f.includes("debian"),
  );
  if (process.platform === "win32" && !hasLinux) {
    console.error(
      "KCCC Netlify build: missing Linux Prisma engine after generate. Check binaryTargets in schema.prisma.",
    );
    console.error("engines:", engines.join(", ") || "(none)");
    process.exit(1);
  }
  console.log("KCCC Netlify build: prisma engines present:", engines.join(", ") || "(none)");
}

run("next build", [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"]);

console.log("KCCC Netlify build: complete");
