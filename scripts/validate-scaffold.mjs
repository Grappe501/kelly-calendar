import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/load-env-files.mjs";

const requiredPaths = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "netlify.toml",
  "vitest.config.ts",
  "playwright.config.ts",
  "eslint.config.mjs",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/calendar/page.tsx",
  "src/app/add/page.tsx",
  "src/app/search/page.tsx",
  "src/app/more/page.tsx",
  "src/app/system/status/page.tsx",
  "src/app/system/environment/page.tsx",
  "src/app/system/security/page.tsx",
  "src/app/api/health/route.ts",
  "src/app/api/system/status/route.ts",
  "src/app/api/system/environment/route.ts",
  "src/app/api/system/security/route.ts",
  "src/middleware.ts",
  "src/components/navigation/BottomNav.tsx",
  "prisma/schema.prisma",
  "prisma/README.md",
  "scripts/check-red-dirt-db-connection.mjs",
  "scripts/run-with-h-drive-env.cjs",
];

let failed = false;

for (const rel of requiredPaths) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) {
    console.error(`FAIL: missing scaffold file ${rel}`);
    failed = true;
  } else {
    console.log(`PASS: ${rel}`);
  }
}

const schema = fs.readFileSync(path.join(repoRoot, "prisma/schema.prisma"), "utf8");
if (/^\s*model\s+/m.test(schema)) {
  console.error("FAIL: prisma/schema.prisma must not define models in Step 2");
  failed = true;
} else {
  console.log("PASS: prisma schema has no models");
}

const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
for (const script of ["dev", "build", "typecheck", "lint", "test", "check", "step3:validate", "step3:all"]) {
  if (!pkg.scripts?.[script]) {
    console.error(`FAIL: missing npm script ${script}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Scaffold validation passed.");
