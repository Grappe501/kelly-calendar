import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "src/app/api");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

const mutationMarkers = [
  "withAuthenticatedMutation",
  "blockUnauthorizedMutation",
  "requireActiveAuthenticatedActor",
  "requireAuthenticatedActor",
  "mutationsAuthorized",
];
const publicOk = [
  `${path.sep}api${path.sep}health${path.sep}`,
  `${path.sep}api${path.sep}auth${path.sep}`,
  `${path.sep}api${path.sep}workflows${path.sep}`,
  `${path.sep}api${path.sep}event-entry${path.sep}`,
];

let failed = 0;
const routes = walk(apiRoot);
for (const file of routes) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  const isPublic = publicOk.some((p) => file.includes(p));
  const hasPostPutPatchDelete = /\bexport\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(
    text,
  );
  if (!hasPostPutPatchDelete || isPublic) {
    console.log("SKIP:", rel);
    continue;
  }
  const protectedRoute = mutationMarkers.some((m) => text.includes(m));
  if (protectedRoute) console.log("PASS:", rel);
  else {
    console.error("FAIL: unprotected mutation route", rel);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
