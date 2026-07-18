import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = JSON.parse(
  fs.readFileSync(path.join(root, "data/netlify_target.json"), "utf8"),
);
const build = JSON.parse(
  fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"),
);

const report = {
  generatedAt: new Date().toISOString(),
  step: "KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF",
  status: "BLOCKED",
  blockers: [
    "Canonical Netlify site not verified",
    "Netlify CLI session expired / operator login required",
    "APP_SESSION_SECRET not proven in Netlify",
    "Deployed mutation proofs not executed",
    "Operator acceptance pending",
  ],
  netlifyTarget: {
    status: target.status,
    repository: target.repository,
    productionBranch: target.productionBranch,
    siteName: target.siteName,
    siteId: target.siteId,
    productionUrl: target.productionUrl,
  },
  candidate_data_ready: build.candidate_data_ready === true,
  step6_held: build.next_step !== "KCCC-STEP-06-MOBILE-COMMAND-SHELL",
  localBaseline: {
    step56UnlockCommit: build.step_5_6_unlock_commit || "83c2bd4",
    tip: build.commit_hash,
  },
};

const outDir = path.join(root, "develop_notes/database_proofs");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "step-5-7-proof-latest.json");
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
console.log("Step 5.7 proof report written.");
