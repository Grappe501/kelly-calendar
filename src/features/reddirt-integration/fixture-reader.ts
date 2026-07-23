import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RawStrategicRecord } from "@/features/reddirt-integration/types";

export const REDDIRT_FIXTURE_RELATIVE =
  "src/features/reddirt-integration/fixtures/strategic-geography-sample.json";

export type RedDirtFixturePayload = {
  _label: string;
  _source: string;
  records: RawStrategicRecord[];
};

export function loadStrategicGeographyFixture(
  rootDir = process.cwd(),
): RedDirtFixturePayload {
  const path = join(rootDir, REDDIRT_FIXTURE_RELATIVE);
  const raw = JSON.parse(readFileSync(path, "utf8")) as RedDirtFixturePayload;
  if (!raw._label?.includes("FIXTURE")) {
    throw new Error("RedDirt fixture missing FIXTURE label.");
  }
  if (!Array.isArray(raw.records) || raw.records.length < 1) {
    throw new Error("RedDirt fixture has no records.");
  }
  return raw;
}
