/**
 * Deployed auth route proof. Requires KCCC_DEPLOY_URL.
 * Without deploy URL: exit 1 with operator block (honest).
 */
const base = process.env.KCCC_DEPLOY_URL?.trim().replace(/\/$/, "");
if (!base) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED");
  console.error("Set KCCC_DEPLOY_URL to the production site URL after Netlify deploy.");
  process.exit(1);
}

async function check(path, init) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    redirect: "manual",
  });
  return res;
}

let failed = 0;
try {
  const page = await check("/system/step-5-6", { method: "GET" });
  if ([301, 302, 303, 307, 308].includes(page.status)) {
    const loc = page.headers.get("location") || "";
    if (loc.includes("/login")) console.log("PASS: anonymous /system/step-5-6 redirects to login");
    else {
      console.error(`FAIL: redirect location unexpected: ${loc}`);
      failed += 1;
    }
  } else {
    console.error(`FAIL: expected redirect, got ${page.status}`);
    failed += 1;
  }

  for (const path of [
    "/api/events",
    "/api/events/proof-missing",
    "/api/events/proof-missing/workflow/apply",
  ]) {
    const res = await check(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (res.status === 401) console.log(`PASS: anonymous ${path} → 401`);
    else {
      console.error(`FAIL: anonymous ${path} → ${res.status}`);
      failed += 1;
    }
    const body = await res.text();
    if (/stack|postgres:\/\/|APP_SESSION_SECRET=|passwordHash/i.test(body)) {
      console.error(`FAIL: unsafe body content on ${path}`);
      failed += 1;
    }
  }
} catch (error) {
  console.error("FAIL: deploy probe error", error instanceof Error ? error.message : "unknown");
  failed += 1;
}

if (failed) process.exit(1);
console.log("PASS: deployed auth routes");
