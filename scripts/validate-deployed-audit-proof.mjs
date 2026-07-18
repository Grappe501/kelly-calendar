const base = process.env.KCCC_DEPLOY_URL?.trim();
if (!base) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED (KCCC_DEPLOY_URL)");
  process.exit(1);
}
console.error("BLOCKED — OPERATOR ACTION REQUIRED");
console.error("Audit attribution proof requires operator-authenticated mutations + DB/admin review.");
process.exit(1);
