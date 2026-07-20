/**
 * Allow CLI tooling to import server modules that declare `server-only`.
 * Never used by the Next.js browser bundle.
 */
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function shimServerOnly(id) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments);
};
