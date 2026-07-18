/**
 * Documents Netlify auth env gate. Does not print secrets.
 * Fails in production-like CI if APP_SESSION_SECRET missing/too short.
 */
const isProdLike = Boolean(process.env.NETLIFY || process.env.CI);
const secret = process.env.APP_SESSION_SECRET?.trim() ?? "";

if (!isProdLike) {
  console.log("PASS: local/dev — Netlify secret gate advisory only");
  console.log("NOTE: Production must set APP_SESSION_SECRET (32+ chars), DATABASE_URL, DIRECT_URL");
  process.exit(0);
}

if (secret.length < 32) {
  console.error("FAIL: APP_SESSION_SECRET missing or too short in CI/Netlify");
  process.exit(1);
}
if (secret === "KcccDevOnly-ChangeMe-Step4!" || secret.includes("unit-test-session")) {
  console.error("FAIL: development/default session secret prohibited in production");
  process.exit(1);
}
console.log("PASS: APP_SESSION_SECRET present with sufficient length (value not printed)");
process.exit(0);
