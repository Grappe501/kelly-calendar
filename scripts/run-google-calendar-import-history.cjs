/**
 * CLI entry: stub `server-only`, then run the TypeScript dry-run importer via tsx.
 */
const Module = require("module");
const path = require("path");

const stub = path.join(__dirname, "cli-node_modules", "server-only", "index.js");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveServerOnlyStub(
  request,
  parent,
  isMain,
  options,
) {
  if (request === "server-only") return stub;
  return originalResolve.call(this, request, parent, isMain, options);
};

require("tsx/cjs/api").register();
require(path.join(__dirname, "google-calendar-import-history.ts"));
