import fs from "node:fs";
import path from "node:path";
import { repoRoot, workspaceRoot } from "./lib/load-env-files.mjs";

const cacheRoot = path.join(workspaceRoot, ".cache");
const requiredDirs = [
  path.join(cacheRoot, "npm"),
  path.join(cacheRoot, "temp"),
  path.join(cacheRoot, "playwright"),
  path.join(cacheRoot, "next"),
  path.join(cacheRoot, "prisma"),
];

let failed = false;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

const resolvedRoot = path.resolve(repoRoot);
const folderName = path.basename(resolvedRoot);

if (!/^kelly-calendar$/i.test(folderName)) {
  fail(`Repo root folder must be kelly-calendar (found ${folderName})`);
} else {
  pass(`Workspace folder ${folderName}`);
}

if (!/^H:/i.test(resolvedRoot)) {
  fail("Project root must be on H: drive");
} else {
  pass("Project root is on H:");
}

for (const dir of requiredDirs) {
  fs.mkdirSync(dir, { recursive: true });
  if (!/^H:/i.test(dir)) {
    fail(`Cache dir not on H:: ${dir}`);
  } else {
    pass(`Cache ready: ${path.relative(workspaceRoot, dir)}`);
  }
}

const npmrc = fs.readFileSync(path.join(repoRoot, ".npmrc"), "utf8");
if (!/H:\/SOSWebsite\/\.cache\/npm/i.test(npmrc)) {
  fail(".npmrc cache is not pointed at H:/SOSWebsite/.cache/npm");
} else {
  pass(".npmrc cache points at H:/SOSWebsite/.cache/npm");
}

const nodeModules = path.join(repoRoot, "node_modules");
if (fs.existsSync(nodeModules)) {
  if (!/^H:/i.test(nodeModules)) {
    fail("node_modules is not on H:");
  } else {
    pass("node_modules is on H:");
  }
} else {
  pass("node_modules not installed yet (acceptable before npm install)");
}

if (failed) {
  process.exit(1);
}

console.log("H-drive validation passed.");
