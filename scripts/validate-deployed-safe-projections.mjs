const base = process.env.KCCC_DEPLOY_URL?.trim();
if (!base) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED (KCCC_DEPLOY_URL)");
  process.exit(1);
}
console.error("BLOCKED — OPERATOR ACTION REQUIRED");
console.error("Safe projection proofs require authenticated role matrix against deployed APIs.");
process.exit(1);
