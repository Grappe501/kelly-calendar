import { classifyTarget, loadDatabaseEnv } from "./lib/db-env.mjs";

const { databaseUrl, directUrl } = loadDatabaseEnv();
const classification = classifyTarget(databaseUrl);

console.log("Kelly Calendar database target classification");
console.log(`Connection present: ${Boolean(databaseUrl)}`);
console.log(`Direct URL present: ${Boolean(directUrl)}`);
console.log(`Target class: ${classification.class}`);
console.log(`Hosted: ${classification.hosted}`);
console.log(`Loopback: ${Boolean(classification.loopback)}`);
if (classification.hostnameRedacted) {
  console.log(`Host classification (redacted): ${classification.hostnameRedacted}`);
}
if (classification.databaseNameFingerprint) {
  console.log(`Database name fingerprint: ${classification.databaseNameFingerprint}`);
}
if (classification.sslConfiguration) {
  console.log(`SSL configuration: ${classification.sslConfiguration}`);
}
console.log(`Production likelihood: ${classification.productionLikelihood}`);
if (classification.productionLikelihoodWarning) {
  console.log(`Warning: ${classification.productionLikelihoodWarning}`);
}
console.log("Migration capability: deploy-only via db:migration:apply (gated)");
console.log("Credentials: redacted");

if (!databaseUrl) process.exit(1);
if (classification.class === "unparseable") process.exit(1);
