/**
 * Anonymous status-contract probes against KCCC_DEPLOY_URL.
 * Authenticated 403/409 proofs remain for Step 5.7D.
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

let failed = 0;

async function probe(label, path, init, expectStatuses) {
  const res = await fetch(`${base}${path}`, { ...init, redirect: "manual" });
  const body = await res.text();
  if (!expectStatuses.includes(res.status)) {
    console.error(`FAIL: ${label} expected ${expectStatuses.join("|")}, got ${res.status}`);
    failed += 1;
  } else {
    console.log(`PASS: ${label} → ${res.status}`);
  }
  if (/stack|postgres:\/\/|prisma\+postgres|APP_SESSION_SECRET=|passwordHash|at Object\./i.test(body)) {
    console.error(`FAIL: ${label} unsafe body content`);
    failed += 1;
  }
  return { res, body };
}

try {
  await probe(
    "anonymous POST /api/events",
    "/api/events",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
    [401],
  );
  await probe(
    "anonymous PATCH missing event",
    "/api/events/00000000-0000-4000-8000-000000000000",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedVersion: 1, internalTitle: "x" }),
    },
    [401, 404],
  );
  // Malformed JSON often surfaces as 400 after auth, or 401 when middleware gates first.
  await probe(
    "anonymous malformed JSON",
    "/api/events",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    },
    [400, 401],
  );
  console.log("NOTE: authenticated 403/409 deferred to synthetic mutation proof");
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : "probe error");
  failed += 1;
}

if (failed) process.exit(1);
console.log("PASS: deployed status contracts (anonymous)");
