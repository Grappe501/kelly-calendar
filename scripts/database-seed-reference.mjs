/**
 * Idempotent reference seed for kelly_calendar.
 * No real candidate events, donors, Google URLs, or secrets.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Ensure client is generated
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

const REGIONS = [
  { slug: "central", name: "Central Arkansas" },
  { slug: "northwest", name: "Northwest Arkansas" },
  { slug: "northeast", name: "Northeast Arkansas" },
  { slug: "southwest", name: "Southwest Arkansas" },
  { slug: "southeast", name: "Southeast Arkansas" },
  { slug: "river-valley", name: "River Valley" },
  { slug: "delta", name: "Delta" },
];

/** FIPS + names for all 75 Arkansas counties */
const COUNTIES = [
  ["05001", "Arkansas"], ["05003", "Ashley"], ["05005", "Baxter"], ["05007", "Benton"],
  ["05009", "Boone"], ["05011", "Bradley"], ["05013", "Calhoun"], ["05015", "Carroll"],
  ["05017", "Chicot"], ["05019", "Clark"], ["05021", "Clay"], ["05023", "Cleburne"],
  ["05025", "Cleveland"], ["05027", "Columbia"], ["05029", "Conway"], ["05031", "Craighead"],
  ["05033", "Crawford"], ["05035", "Crittenden"], ["05037", "Cross"], ["05039", "Dallas"],
  ["05041", "Desha"], ["05043", "Drew"], ["05045", "Faulkner"], ["05047", "Franklin"],
  ["05049", "Fulton"], ["05051", "Garland"], ["05053", "Grant"], ["05055", "Greene"],
  ["05057", "Hempstead"], ["05059", "Hot Spring"], ["05061", "Howard"], ["05063", "Independence"],
  ["05065", "Izard"], ["05067", "Jackson"], ["05069", "Jefferson"], ["05071", "Johnson"],
  ["05073", "Lafayette"], ["05075", "Lawrence"], ["05077", "Lee"], ["05079", "Lincoln"],
  ["05081", "Little River"], ["05083", "Logan"], ["05085", "Lonoke"], ["05087", "Madison"],
  ["05089", "Marion"], ["05091", "Miller"], ["05093", "Mississippi"], ["05095", "Monroe"],
  ["05097", "Montgomery"], ["05099", "Nevada"], ["05101", "Newton"], ["05103", "Ouachita"],
  ["05105", "Perry"], ["05107", "Phillips"], ["05109", "Pike"], ["05111", "Poinsett"],
  ["05113", "Polk"], ["05115", "Pope"], ["05117", "Prairie"], ["05119", "Pulaski"],
  ["05121", "Randolph"], ["05123", "St. Francis"], ["05125", "Saline"], ["05127", "Scott"],
  ["05129", "Searcy"], ["05131", "Sebastian"], ["05133", "Sevier"], ["05135", "Sharp"],
  ["05137", "Stone"], ["05139", "Union"], ["05141", "Van Buren"], ["05143", "Washington"],
  ["05145", "White"], ["05147", "Woodruff"], ["05149", "Yell"],
];

const GROUPS = [
  { slug: "candidate-operations", name: "Candidate Operations", displayOrder: 1 },
  { slug: "public-engagement", name: "Public Engagement", displayOrder: 2 },
  { slug: "communications", name: "Communications", displayOrder: 3 },
  { slug: "campaign-operations", name: "Campaign Operations", displayOrder: 4 },
  { slug: "protected-and-personal", name: "Protected and Personal", displayOrder: 5 },
];

const CALENDARS = [
  { slug: "command", name: "Command Calendar", type: "COMMAND", group: "candidate-operations", command: true, color: "command", rollup: "FULL_DETAIL", direct: false },
  { slug: "candidate", name: "Candidate Schedule", type: "CANDIDATE", group: "candidate-operations", color: "candidate" },
  { slug: "travel", name: "Travel", type: "TRAVEL", group: "candidate-operations", color: "travel" },
  { slug: "fundraising", name: "Fundraising", type: "FUNDRAISING", group: "campaign-operations", color: "fundraising" },
  { slug: "public-events", name: "Public Events", type: "PUBLIC_EVENTS", group: "public-engagement", color: "events" },
  { slug: "internal-meetings", name: "Internal Meetings", type: "INTERNAL_MEETINGS", group: "candidate-operations", color: "staff" },
  { slug: "communications", name: "Communications", type: "COMMUNICATIONS", group: "communications", color: "communications" },
  { slug: "social-media", name: "Social Media", type: "SOCIAL_MEDIA", group: "communications", color: "social" },
  { slug: "press-media", name: "Press and Media", type: "PRESS_MEDIA", group: "communications", color: "press" },
  { slug: "field", name: "Field Organizing", type: "FIELD", group: "campaign-operations", color: "field" },
  { slug: "county-activity", name: "County Activity", type: "COUNTY_ACTIVITY", group: "public-engagement", color: "county" },
  { slug: "volunteer", name: "Volunteer Operations", type: "VOLUNTEER", group: "public-engagement", color: "volunteer" },
  { slug: "compliance", name: "Compliance", type: "COMPLIANCE", group: "campaign-operations", color: "compliance" },
  { slug: "staff-work", name: "Staff Work Schedules", type: "STAFF_WORK", group: "campaign-operations", color: "staff", rollup: "MILESTONES_ONLY" },
  { slug: "debate-prep", name: "Debate Preparation", type: "DEBATE_PREP", group: "candidate-operations", color: "candidate" },
  { slug: "surrogate", name: "Surrogate Activity", type: "SURROGATE", group: "public-engagement", color: "events" },
  { slug: "protected-personal", name: "Protected Personal Time", type: "PROTECTED_PERSONAL", group: "protected-and-personal", color: "personal", rollup: "BUSY_ONLY", visibility: "BUSY_ONLY", location: "HIDDEN" },
];

const TEMPLATES = [
  ["county-visit", "County Visit", "COUNTY_ACTIVITY", "Community meeting"],
  ["festival", "Festival Appearance", "PUBLIC_EVENTS", "Festival"],
  ["fundraiser", "Fundraiser", "FUNDRAISING", "Fundraiser"],
  ["candidate-forum", "Candidate Forum", "PUBLIC_EVENTS", "Candidate forum"],
  ["debate", "Debate", "DEBATE_PREP", "Debate"],
  ["press-interview", "Press Interview", "PRESS_MEDIA", "Media preparation"],
  ["social-recording", "Social Media Recording", "SOCIAL_MEDIA", "Other"],
  ["volunteer-canvass", "Volunteer Canvass Launch", "VOLUNTEER", "Door-knocking launch"],
  ["community-meeting", "Community Meeting", "PUBLIC_EVENTS", "Community meeting"],
  ["donor-call-time", "Donor Call Time", "FUNDRAISING", "Call time"],
  ["travel-block", "Travel Block", "TRAVEL", "Travel block"],
  ["internal-meeting", "Internal Campaign Meeting", "INTERNAL_MEETINGS", "Meeting"],
  ["protected-personal-block", "Protected Personal Block", "PROTECTED_PERSONAL", "Protected personal block"],
];

const VIEWS = [
  "My Day",
  "Command Calendar",
  "Candidate Week",
  "Travel Only",
  "Communications Week",
  "Public Campaign",
  "County Events",
  "Election and Compliance Deadlines",
  "Leadership Operations",
];

try {
  for (const region of REGIONS) {
    await prisma.arkansasRegion.upsert({
      where: { slug: region.slug },
      create: region,
      update: { name: region.name, isActive: true },
    });
  }

  const regionMap = Object.fromEntries(
    (await prisma.arkansasRegion.findMany()).map((r) => [r.slug, r.id]),
  );

  // Rough region assignment by known clusters
  const nw = new Set(["Benton", "Washington", "Madison", "Carroll", "Boone", "Newton", "Searcy"]);
  const central = new Set(["Pulaski", "Saline", "Faulkner", "Lonoke", "Perry", "Conway", "Van Buren", "Cleburne"]);

  for (const [fips, name] of COUNTIES) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let regionId = regionMap.central;
    if (nw.has(name)) regionId = regionMap.northwest;
    else if (central.has(name)) regionId = regionMap.central;
    await prisma.arkansasCounty.upsert({
      where: { fipsCode: fips },
      create: { fipsCode: fips, name, slug, regionId, isActive: true },
      update: { name, slug, regionId, isActive: true },
    });
  }

  for (const group of GROUPS) {
    await prisma.calendarGroup.upsert({
      where: { slug: group.slug },
      create: { ...group, isSystemGroup: true, isActive: true },
      update: { name: group.name, displayOrder: group.displayOrder, isActive: true },
    });
  }

  const groupMap = Object.fromEntries(
    (await prisma.calendarGroup.findMany()).map((g) => [g.slug, g.id]),
  );

  for (const cal of CALENDARS) {
    await prisma.calendar.upsert({
      where: { slug: cal.slug },
      create: {
        slug: cal.slug,
        name: cal.name,
        shortName: cal.name,
        calendarType: cal.type,
        calendarGroupId: groupMap[cal.group],
        isSystemCalendar: true,
        isCommandCalendar: Boolean(cal.command),
        isActive: true,
        defaultVisibility: cal.visibility || "TITLE_LOCATION",
        defaultLocationDisclosure: cal.location || "CITY",
        defaultRollupMode: cal.rollup || "TITLE_LOCATION",
        displayColorToken: cal.color,
        allowsDirectEventCreation: cal.direct !== false,
      },
      update: {
        name: cal.name,
        calendarType: cal.type,
        calendarGroupId: groupMap[cal.group],
        isCommandCalendar: Boolean(cal.command),
        isActive: true,
      },
    });
  }

  const command = await prisma.calendar.findUnique({ where: { slug: "command" } });
  const sources = await prisma.calendar.findMany({
    where: { isCommandCalendar: false, isSystemCalendar: true },
  });
  for (const source of sources) {
    const existing = await prisma.calendarRollupRule.findFirst({
      where: { sourceCalendarId: source.id, targetCalendarId: command.id },
    });
    if (!existing) {
      await prisma.calendarRollupRule.create({
        data: {
          sourceCalendarId: source.id,
          targetCalendarId: command.id,
          rollupMode: source.defaultRollupMode,
          includeSafeTitle: true,
          includeCalendarName: true,
          includeLocation: source.calendarType !== "PROTECTED_PERSONAL",
        },
      });
    }
  }

  for (const [slug, name, type, eventType] of TEMPLATES) {
    await prisma.eventTemplate.upsert({
      where: { slug },
      create: {
        slug,
        name,
        primaryCalendarType: type,
        eventType,
        isSystemTemplate: true,
        isActive: true,
        version: 1,
        snapshotJson: { name, type, eventType },
      },
      update: { name, eventType, isActive: true },
    });
  }

  await prisma.packingTemplate.upsert({
    where: { slug: "standard-campaign" },
    create: {
      slug: "standard-campaign",
      name: "Standard campaign materials",
      isSystemTemplate: true,
      version: 1,
      items: {
        create: [
          { itemName: "Palm cards", category: "CAMPAIGN_MATERIAL", quantity: 100 },
          { itemName: "Banner", category: "SIGNAGE", quantity: 1 },
          { itemName: "Sign-up sheets", category: "VOLUNTEER", quantity: 10 },
        ],
      },
    },
    update: { name: "Standard campaign materials", isSystemTemplate: true },
  });

  for (const [index, name] of VIEWS.entries()) {
    const slugName = name;
    const existing = await prisma.calendarSavedView.findFirst({
      where: { name: slugName, isSystemView: true },
    });
    if (!existing) {
      await prisma.calendarSavedView.create({
        data: {
          name: slugName,
          isSystemView: true,
          isDefault: index === 0,
          sortOrder: index,
        },
      });
    }
  }

  await prisma.eventNumberCounter.upsert({
    where: { year: 2026 },
    create: { year: 2026, nextValue: 1 },
    update: {},
  });

  const countyCount = await prisma.arkansasCounty.count();
  const calendarCount = await prisma.calendar.count();
  console.log(`Seed complete: ${countyCount} counties, ${calendarCount} calendars`);
  if (countyCount !== 75) {
    console.error(`FAIL: expected 75 counties, got ${countyCount}`);
    process.exit(1);
  }
  console.log("Reference seed is idempotent-safe.");
} finally {
  await prisma.$disconnect();
}
