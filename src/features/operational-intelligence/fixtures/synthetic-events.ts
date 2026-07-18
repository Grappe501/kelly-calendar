/** Synthetic non-production fixtures for layout/tests only — no real PII. */
export const SYNTHETIC_EVENTS = [
  {
    id: "syn_pulaski_festival",
    title: "Pulaski County Festival",
    eventType: "Festival Appearance",
    county: "Pulaski",
    city: "Little Rock",
  },
  {
    id: "syn_benton_fundraiser",
    title: "Benton County Community Reception",
    eventType: "Fundraiser",
    county: "Benton",
    city: "Bentonville",
  },
  {
    id: "syn_washington_forum",
    title: "Washington County Candidate Forum",
    eventType: "Candidate Forum",
    county: "Washington",
    city: "Fayetteville",
  },
  {
    id: "syn_craighead_press",
    title: "Craighead County Press Interview",
    eventType: "Press Interview",
    county: "Craighead",
    city: "Jonesboro",
  },
  {
    id: "syn_sebastian_overnight",
    title: "Sebastian County Overnight Trip",
    eventType: "Overnight Travel",
    county: "Sebastian",
    city: "Fort Smith",
  },
  {
    id: "syn_protected",
    title: "Protected Personal Appointment",
    eventType: "Protected Personal Time",
    county: null,
    city: null,
  },
  {
    id: "syn_internal",
    title: "Internal Campaign Planning Meeting",
    eventType: "Internal Campaign Meeting",
    county: "Pulaski",
    city: "Little Rock",
  },
] as const;
