/** Fabricated audience pools — never real campaign contacts. */
export type FabricatedAudiencePerson = {
  localPersonId: string;
  displayName: string;
  county: string;
  volunteerActive: boolean;
  email: string | null;
  phone: string | null;
  phoneCapability: "MOBILE" | "LANDLINE" | "UNKNOWN" | null;
  emailConsent: boolean;
  smsConsent: boolean;
  suppressed: boolean;
  fabricatedBanner: "FABRICATED TEST DATA";
};

export const FABRICATED_AUDIENCE_POOLS: Record<string, FabricatedAudiencePerson[]> = {
  sandbox_email: [
    {
      localPersonId: "fab-person-001",
      displayName: "Alex Rivera",
      county: "Tulsa",
      volunteerActive: true,
      email: "alex.rivera@example.test",
      phone: null,
      phoneCapability: null,
      emailConsent: true,
      smsConsent: false,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-person-002",
      displayName: "Jordan Blake",
      county: "Oklahoma",
      volunteerActive: true,
      email: "jordan.blake@example.test",
      phone: "+14055550100",
      phoneCapability: "MOBILE",
      emailConsent: true,
      smsConsent: true,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-person-003",
      displayName: "Sam Lee",
      county: "Tulsa",
      volunteerActive: false,
      email: "sam.lee@example.test",
      phone: null,
      phoneCapability: null,
      emailConsent: false,
      smsConsent: false,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-person-004",
      displayName: "Suppressed Example",
      county: "Cleveland",
      volunteerActive: true,
      email: "suppressed@example.test",
      phone: null,
      phoneCapability: null,
      emailConsent: true,
      smsConsent: false,
      suppressed: true,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-person-005",
      displayName: "Dup Dest A",
      county: "Tulsa",
      volunteerActive: true,
      email: "shared@example.test",
      phone: null,
      phoneCapability: null,
      emailConsent: true,
      smsConsent: false,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-person-006",
      displayName: "Dup Dest B",
      county: "Tulsa",
      volunteerActive: true,
      email: "shared@example.test",
      phone: null,
      phoneCapability: null,
      emailConsent: true,
      smsConsent: false,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
  ],
  sandbox_sms: [
    {
      localPersonId: "fab-sms-001",
      displayName: "Casey Mobile",
      county: "Tulsa",
      volunteerActive: true,
      email: null,
      phone: "+19185550194",
      phoneCapability: "MOBILE",
      emailConsent: false,
      smsConsent: true,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-sms-002",
      displayName: "Landline Only",
      county: "Oklahoma",
      volunteerActive: true,
      email: null,
      phone: "+14055550111",
      phoneCapability: "LANDLINE",
      emailConsent: false,
      smsConsent: true,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-sms-003",
      displayName: "Unknown Capability",
      county: "Tulsa",
      volunteerActive: true,
      email: null,
      phone: "+14055550122",
      phoneCapability: "UNKNOWN",
      emailConsent: false,
      smsConsent: true,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
  ],
  /** Clean pool without duplicate destinations — for happy-path manifests */
  sandbox_email_clean: [
    {
      localPersonId: "fab-clean-001",
      displayName: "Alex Rivera",
      county: "Tulsa",
      volunteerActive: true,
      email: "alex.clean@example.test",
      phone: null,
      phoneCapability: null,
      emailConsent: true,
      smsConsent: false,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
    {
      localPersonId: "fab-clean-002",
      displayName: "Jordan Blake",
      county: "Oklahoma",
      volunteerActive: true,
      email: "jordan.clean@example.test",
      phone: "+14055550100",
      phoneCapability: "MOBILE",
      emailConsent: true,
      smsConsent: true,
      suppressed: false,
      fabricatedBanner: "FABRICATED TEST DATA",
    },
  ],
};

export function getFabricatedPool(key: string): FabricatedAudiencePerson[] {
  return FABRICATED_AUDIENCE_POOLS[key] ?? [];
}
