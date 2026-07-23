/**
 * IC-01 Arkansas geography foundation seed.
 * Local JSON only — no network. Never creates Events/Missions.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

spawnSync(process.execPath, ["scripts/run-prisma.cjs", "generate"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
if (loaded.DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = loaded.DATABASE_URL;
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function fingerprint(obj) {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bst\.?\b/g, "saint")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cuidLike() {
  return `geo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const countiesDoc = readJson("data/geography/arkansas-counties-authority.json");
const placesDoc = readJson("data/geography/arkansas-top250-places-planning.json");
const sourceDoc = readJson("data/geography/arkansas-geography-source-register.json");

if (countiesDoc.counties.length !== 75) {
  throw new Error(`Expected 75 counties, got ${countiesDoc.counties.length}`);
}
if (placesDoc.places.length !== 250) {
  throw new Error(`Expected 250 places, got ${placesDoc.places.length}`);
}

const countiesFp = fingerprint(countiesDoc.counties);
const placesFp = fingerprint(placesDoc.places);

const proof = {
  startedAt: new Date().toISOString(),
  countiesExpected: 75,
  placesExpected: 250,
  countiesCreated: 0,
  countiesUpdated: 0,
  countiesUnchanged: 0,
  placesCreated: 0,
  placesUpdated: 0,
  placesUnchanged: 0,
  placeCountyLinksUpserted: 0,
  sourcesUpserted: 0,
  eventsCreated: 0,
  missionsCreated: 0,
  fingerprints: {
    counties: countiesFp,
    places: placesFp,
  },
};

async function main() {
  // Sources + fingerprints
  for (const src of sourceDoc.sources) {
    const localFp =
      src.localPath?.includes("counties")
        ? countiesFp
        : src.localPath?.includes("places")
          ? placesFp
          : fingerprint(src);
    await prisma.geographySource.upsert({
      where: { sourceKey: src.sourceKey },
      create: {
        id: cuidLike(),
        sourceKey: src.sourceKey,
        publisher: src.publisher,
        title: src.title,
        url: src.url ?? null,
        vintage: src.vintage ?? null,
        retrievalDate: src.retrievalDate ? new Date(src.retrievalDate) : null,
        localPath: src.localPath ?? null,
        contentFingerprint: localFp,
      },
      update: {
        publisher: src.publisher,
        title: src.title,
        url: src.url ?? null,
        vintage: src.vintage ?? null,
        retrievalDate: src.retrievalDate ? new Date(src.retrievalDate) : null,
        localPath: src.localPath ?? null,
        contentFingerprint: localFp,
      },
    });
    proof.sourcesUpserted += 1;
  }

  // Update source register file fingerprints (local only)
  const registerPath = path.join(
    root,
    "data/geography/arkansas-geography-source-register.json",
  );
  const register = readJson("data/geography/arkansas-geography-source-register.json");
  for (const src of register.sources) {
    if (src.localPath?.includes("counties")) src.contentFingerprint = countiesFp;
    else if (src.localPath?.includes("places")) src.contentFingerprint = placesFp;
  }
  fs.writeFileSync(registerPath, JSON.stringify(register, null, 2) + "\n");

  const importRun = await prisma.geographyImportRun.create({
    data: {
      id: cuidLike(),
      runKind: "FOUNDATION_SEED",
      status: "STARTED",
    },
  });

  const countyIdByFips = new Map();

  for (const c of countiesDoc.counties) {
    const existing = await prisma.arkansasCounty.findUnique({
      where: { fipsCode: c.fipsCode },
    });
    const data = {
      name: c.name,
      slug: c.slug,
      stateFips: c.stateFips ?? "05",
      geoid: c.geoid ?? c.fipsCode,
      normalizedName: c.normalizedName ?? normalizeName(c.name),
      countySeat: c.countySeat,
      sourceKey: "census-ar-counties-fips-2020",
      dataVintage: countiesDoc.meta?.vintage ?? "2020",
      seatReviewState: "CONFIRMED",
      isActive: true,
    };

    if (!existing) {
      const created = await prisma.arkansasCounty.create({
        data: { id: cuidLike(), fipsCode: c.fipsCode, ...data },
      });
      countyIdByFips.set(c.fipsCode, created.id);
      proof.countiesCreated += 1;
    } else {
      countyIdByFips.set(c.fipsCode, existing.id);
      const same =
        existing.geoid === data.geoid &&
        existing.countySeat === data.countySeat &&
        existing.normalizedName === data.normalizedName &&
        existing.stateFips === data.stateFips;
      if (same) {
        proof.countiesUnchanged += 1;
      } else {
        await prisma.arkansasCounty.update({
          where: { id: existing.id },
          data,
        });
        proof.countiesUpdated += 1;
      }
    }
  }

  for (const p of placesDoc.places) {
    const slugBase = slugify(p.name);
    const slug = `${slugBase}-${p.censusPlaceGeoid}`;
    const existing = await prisma.geographyPlaceAuthority.findUnique({
      where: { censusPlaceGeoid: p.censusPlaceGeoid },
    });
    const data = {
      name: p.name,
      slug,
      placeType: p.placeType,
      population: p.population,
      populationRank: p.populationRank,
      populationVintage: placesDoc.meta?.populationVintage ?? "Census 2020 Decennial",
      normalizedName: normalizeName(p.name),
      sourceKey: "census-ar-places-pop-2020",
      dataVintage: placesDoc.meta?.geographyVintage ?? "Census 2020 Places",
      isTop250: true,
      isActive: true,
    };

    let placeId;
    if (!existing) {
      const created = await prisma.geographyPlaceAuthority.create({
        data: {
          id: cuidLike(),
          censusPlaceGeoid: p.censusPlaceGeoid,
          ...data,
        },
      });
      placeId = created.id;
      proof.placesCreated += 1;
    } else {
      placeId = existing.id;
      const same =
        existing.population === data.population &&
        existing.populationRank === data.populationRank &&
        existing.placeType === data.placeType &&
        existing.name === data.name &&
        existing.isTop250 === true;
      if (same) {
        proof.placesUnchanged += 1;
      } else {
        await prisma.geographyPlaceAuthority.update({
          where: { id: existing.id },
          data,
        });
        proof.placesUpdated += 1;
      }
    }

    const fipsList = [
      p.primaryCountyFips,
      ...(p.additionalCountyFips ?? []),
    ].filter(Boolean);
    for (const fips of fipsList) {
      const countyId = countyIdByFips.get(fips);
      if (!countyId) continue;
      const link = await prisma.geographyPlaceCounty.findUnique({
        where: {
          placeAuthorityId_countyId: {
            placeAuthorityId: placeId,
            countyId,
          },
        },
      });
      if (!link) {
        await prisma.geographyPlaceCounty.create({
          data: {
            id: cuidLike(),
            placeAuthorityId: placeId,
            countyId,
            isPrimary: fips === p.primaryCountyFips,
          },
        });
        proof.placeCountyLinksUpserted += 1;
      } else if (link.isPrimary !== (fips === p.primaryCountyFips)) {
        await prisma.geographyPlaceCounty.update({
          where: { id: link.id },
          data: { isPrimary: fips === p.primaryCountyFips },
        });
        proof.placeCountyLinksUpserted += 1;
      }
    }
  }

  proof.completedAt = new Date().toISOString();
  proof.secondRunExpectation =
    "Second run should report countiesCreated=0 and placesCreated=0";

  const proofDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, "ic01-geography-seed-latest.json");
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n");

  await prisma.geographyImportRun.update({
    where: { id: importRun.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      countiesUpserted: proof.countiesCreated + proof.countiesUpdated,
      placesUpserted: proof.placesCreated + proof.placesUpdated,
      countiesCreated: proof.countiesCreated,
      placesCreated: proof.placesCreated,
      proofPath: "develop_notes/database_proofs/ic01-geography-seed-latest.json",
      manifestJson: proof,
    },
  });

  console.log(JSON.stringify(proof, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
