import { classifyTarget, loadDatabaseEnv } from "./lib/db-env.mjs";

const { databaseUrl, directUrl } = loadDatabaseEnv();
const classification = classifyTarget(databaseUrl);

console.log("Kelly Calendar database target classification");
console.log(`DATABASE_URL: ${databaseUrl ? "present" : "missing"}`);
console.log(`DIRECT_URL: ${directUrl ? "present" : "missing"}`);
console.log(`Target class: ${classification.class}`);
console.log(`Hosted: ${classification.hosted}`);
if (classification.hostnameRedacted) {
  console.log(`Host (redacted): ${classification.hostnameRedacted}`);
}
console.log("Credentials: redacted");

if (!databaseUrl) process.exit(1);
