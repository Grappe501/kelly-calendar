/**
 * Anonymous safe-projection probes — no protected data without auth.
 */
const base = process.env.KCCC_DEPLOY_URL?.trim().replace(/\/$/, "");
if (!base) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED (KCCC_DEPLOY_URL)");
  process.exit(1);
}
if (/localhost|127\.0\.0\.1/i.test(base)) {
  console.error("FAIL: KCCC_DEPLOY_URL must not target localhost");
  process.exit(1);
}

const sensitive =
  /donor|fundraising|lodging|privateAddress|passwordHash|APP_SESSION_SECRET|postgres:\/\//i;

let failed = 0;
const paths = [
  "/api/events",
  "/api/conflicts",
  "/api/command-summary/today",
  "/api/events/00000000-0000-4000-8000-000000000000/readiness",
];

try {
  for (const path of paths) {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    const body = await res.text();
    if (![401, 302, 303, 307, 308, 404].includes(res.status)) {
      // Some GETs may 200 with empty/safe public shell — still must not leak secrets
      if (res.status === 200 && sensitive.test(body)) {
        console.error(`FAIL: ${path} 200 leaked sensitive content`);
        failed += 1;
        continue;
      }
    }
    if (sensitive.test(body) && res.status !== 401) {
      // 401 bodies should be safe error JSON only
      console.error(`FAIL: ${path} body looks sensitive at ${res.status}`);
      failed += 1;
    } else {
      console.log(`PASS: ${path} → ${res.status} (no protected leak detected)`);
    }
  }
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : "probe error");
  failed += 1;
}

if (failed) process.exit(1);
console.log("PASS: deployed safe projections (anonymous)");
