import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.KCCC_HEADER_PORT ?? "3010";
const base = `http://127.0.0.1:${port}`;

const required = [
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "content-security-policy",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const child = spawn(
  process.execPath,
  [
    path.join(repoRoot, "scripts/run-with-h-drive-env.cjs"),
    "next",
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    port,
  ],
  {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", PORT: port },
    windowsHide: true,
  },
);

let exitCode = 0;

try {
  let ready = false;
  for (let i = 0; i < 60 && !ready; i += 1) {
    await sleep(500);
    try {
      const probe = await fetch(`${base}/api/health`);
      if (probe.ok) ready = true;
    } catch {
      // keep waiting
    }
  }
  if (!ready) throw new Error("Production server did not become ready");

  const response = await fetch(`${base}/`);
  const headers = Object.fromEntries(response.headers.entries());
  for (const name of required) {
    if (!headers[name]) {
      console.error(`FAIL: missing header ${name}`);
      exitCode = 1;
    } else {
      console.log(`PASS: ${name}`);
    }
  }
  if (exitCode === 0) console.log("Security header inspection passed.");
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : "header inspection failed"}`);
  exitCode = 1;
} finally {
  if (child.pid) {
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // ignore
    }
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
  }
  await sleep(800);
  process.exit(exitCode);
}
