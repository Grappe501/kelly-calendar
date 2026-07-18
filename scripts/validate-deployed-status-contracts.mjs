const base = process.env.KCCC_DEPLOY_URL?.trim();
if (!base) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED (KCCC_DEPLOY_URL)");
  process.exit(1);
}
console.error("BLOCKED — OPERATOR ACTION REQUIRED");
console.error("Authenticated 403/409 proofs require operator session; not automatable without credentials.");
process.exit(1);
