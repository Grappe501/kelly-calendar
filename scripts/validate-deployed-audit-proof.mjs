/**
 * Anonymous audit preflight — rejected mutations must not succeed.
 */
const base = process.env.KCCC_DEPLOY_URL?.trim().replace(/\/$/, "");
if (!base) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED (KCCC_DEPLOY_URL)");
  process.exit(1);
}

let failed = 0;
try {
  const res = await fetch(`${base}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      primaryCalendarId: "proof",
      internalTitle: "should-not-create",
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
    }),
    redirect: "manual",
  });
  const body = await res.text();
  if (res.status !== 401) {
    console.error(`FAIL: anonymous create expected 401, got ${res.status}`);
    failed += 1;
  } else {
    console.log("PASS: anonymous create rejected 401");
  }
  if (/\"ok\"\s*:\s*true/.test(body)) {
    console.error("FAIL: anonymous create returned ok:true");
    failed += 1;
  }
  if (/postgres:\/\/|APP_SESSION_SECRET=|passwordHash/i.test(body)) {
    console.error("FAIL: unsafe content in rejection body");
    failed += 1;
  }
  console.log("NOTE: full actor attribution deferred to authenticated mutation proof");
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : "probe error");
  failed += 1;
}

if (failed) process.exit(1);
console.log("PASS: deployed audit preflight (anonymous)");
