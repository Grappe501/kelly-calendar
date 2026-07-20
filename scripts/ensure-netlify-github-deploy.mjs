/**
 * Durable deploy path for KCCC:
 * Stop broken Netlify git-clone continuous builds (exit 128 / host key).
 * Production deploys come from GitHub Actions → `netlify deploy --build --prod`.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SITE_ID = "7d3d021a-ccf1-401f-800f-8e1d1671445c";

function readToken() {
  if (process.env.NETLIFY_AUTH_TOKEN?.trim()) {
    return process.env.NETLIFY_AUTH_TOKEN.trim();
  }
  for (const p of [
    path.join(os.homedir(), ".netlify", "config.json"),
    path.join(os.homedir(), "AppData", "Roaming", "netlify", "Config", "config.json"),
  ]) {
    if (!fs.existsSync(p)) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
      for (const u of Object.values(cfg.users || {})) {
        if (u?.auth?.token) return String(u.auth.token);
      }
    } catch {
      // continue
    }
  }
  return null;
}

const token = readToken();
if (!token) {
  console.error("FAIL: Netlify auth token not found");
  process.exit(1);
}

const getRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}`, {
  headers: { Authorization: `Bearer ${token}`, "User-Agent": "kccc-deploy-fix" },
});
const site = await getRes.json();
if (!getRes.ok) {
  console.error(`FAIL: getSite http ${getRes.status}`);
  process.exit(1);
}

console.log(`Site ........................ ${site.name}`);
console.log(`Repo URL .................... ${site.build_settings?.repo_url || "none"}`);
console.log(
  `Git auto-builds (before) ..... ${site.build_settings?.stop_builds ? "STOPPED" : "ACTIVE"}`,
);

const updateRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "kccc-deploy-fix",
  },
  body: JSON.stringify({
    build_settings: {
      stop_builds: true,
    },
  }),
});
const updated = await updateRes.json().catch(() => ({}));
if (!updateRes.ok) {
  console.error(`FAIL: updateSite http ${updateRes.status}`);
  console.error(String(updated.message || JSON.stringify(updated)).slice(0, 240));
  process.exit(1);
}

console.log(
  `Git auto-builds (after) ...... ${updated.build_settings?.stop_builds ? "STOPPED" : "ACTIVE"}`,
);
console.log("Deploy path .................. GitHub Actions → netlify deploy --build --prod");
console.log("Secret printed ............... NO");
process.exit(0);
