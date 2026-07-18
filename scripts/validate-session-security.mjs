import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cookie = fs.readFileSync(path.join(root, "src/lib/auth/session-cookie.ts"), "utf8");
const login = fs.readFileSync(path.join(root, "src/app/api/auth/login/route.ts"), "utf8");
const logout = fs.readFileSync(path.join(root, "src/app/api/auth/logout/route.ts"), "utf8");
const mw = fs.readFileSync(path.join(root, "src/middleware.ts"), "utf8");

const checks = [
  [cookie.includes("httpOnly: true"), "httpOnly cookie"],
  [cookie.includes('sameSite: "lax"'), "sameSite lax"],
  [cookie.includes("secure:"), "secure flag conditional"],
  [logout.includes("revokeSession"), "logout revokes session"],
  [login.includes("createSessionForUser"), "login creates session"],
  [mw.includes("decodeSessionCookieEdge"), "middleware verifies signature"],
  [cookie.includes("timingSafeEqual"), "timing-safe compare"],
];

let failed = 0;
for (const [ok, name] of checks) {
  if (ok) console.log("PASS:", name);
  else {
    console.error("FAIL:", name);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
