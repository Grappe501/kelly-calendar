import type { OperationalRecommendation } from "@/features/operational-intelligence/types/recommendation-types";

export type RuleContext = {
  eventType?: string | null;
  calendarType?: string | null;
  sensitivityLevel?: string | null;
  locationDisclosure?: string | null;
  travelRequired?: boolean;
  overnight?: boolean;
  mediaExpected?: boolean;
  candidateAttending?: boolean;
};

export type OperationalRule = {
  id: string;
  category:
    | "safety"
    | "compliance"
    | "candidate"
    | "travel"
    | "operations"
    | "communications"
    | "staffing"
    | "packing"
    | "optimization"
    | "historical";
  precedenceRank: number;
  applies: (ctx: RuleContext) => boolean;
  recommend: (ctx: RuleContext) => OperationalRecommendation[];
};

function rec(
  partial: Omit<OperationalRecommendation, "requiresHumanApproval" | "evidence"> & {
    evidence?: OperationalRecommendation["evidence"];
  },
): OperationalRecommendation {
  return {
    ...partial,
    evidence: partial.evidence ?? [{ source: "rule", summary: partial.reasons[0] ?? partial.title }],
    requiresHumanApproval: true,
  };
}

export const OPERATIONAL_RULES: OperationalRule[] = [
  {
    id: "rule_protected_suppress_public",
    category: "safety",
    precedenceRank: 1,
    applies: (ctx) =>
      ctx.calendarType === "PROTECTED_PERSONAL" ||
      ctx.sensitivityLevel === "PROTECTED" ||
      ctx.locationDisclosure === "HIDDEN",
    recommend: () => [
      rec({
        id: "rec_suppress_public_promo",
        recommendationType: "VISIBILITY",
        title: "Keep event protected",
        description: "Do not generate public communications for protected personal time.",
        confidence: 1,
        priority: "CRITICAL",
        reasons: ["Protected visibility outranks public promotion rules"],
        action: "CHANGE_VALUE",
        fieldPath: "defaultVisibility",
        proposedValue: "PROTECTED",
        precedenceRank: 1,
      }),
    ],
  },
  {
    id: "rule_festival_pack_and_staff",
    category: "packing",
    precedenceRank: 50,
    applies: (ctx) => /festival|fair/i.test(ctx.eventType ?? ""),
    recommend: () =>
      [
        "Campaign tent",
        "Tablecloth",
        "Signs",
        "Brochures",
        "Stickers",
        "Volunteer signup QR code",
        "Water",
        "Campaign shirts",
      ].map((item, i) =>
        rec({
          id: `rec_festival_pack_${i}`,
          recommendationType: "PACKING",
          title: `Add packing item: ${item}`,
          description: `Festival appearances typically require ${item.toLowerCase()}.`,
          confidence: 0.85,
          priority: "HIGH",
          reasons: ["Festival event type packing rule"],
          action: "ADD_ITEM",
          fieldPath: "packingItems",
          proposedValue: { itemName: item },
          precedenceRank: 50,
        }),
      ).concat([
        rec({
          id: "rec_festival_photographer",
          recommendationType: "STAFFING",
          title: "Assign photographer",
          description: "Festivals usually need photo and social coverage.",
          confidence: 0.8,
          priority: "HIGH",
          reasons: ["Festival staffing rule"],
          action: "ADD_ITEM",
          fieldPath: "staffAssignments",
          proposedValue: { roleType: "PHOTOGRAPHER" },
          precedenceRank: 45,
        }),
        rec({
          id: "rec_festival_weather",
          recommendationType: "OPERATIONS",
          title: "Outdoor-weather review",
          description: "Confirm weather and contingency before load-in.",
          confidence: 0.9,
          priority: "HIGH",
          reasons: ["Outdoor festival rule"],
          action: "ADD_ITEM",
          precedenceRank: 40,
        }),
      ]),
  },
  {
    id: "rule_fundraiser_compliance",
    category: "compliance",
    precedenceRank: 5,
    applies: (ctx) => /fundrais|donor/i.test(ctx.eventType ?? ""),
    recommend: () => [
      rec({
        id: "rec_fundraiser_finance_lead",
        recommendationType: "STAFFING",
        title: "Assign finance lead",
        description: "Fundraisers require finance ownership.",
        confidence: 0.95,
        priority: "CRITICAL",
        reasons: ["Fundraising compliance rule"],
        action: "ADD_ITEM",
        fieldPath: "staffAssignments",
        proposedValue: { roleType: "FINANCE_LEAD" },
        precedenceRank: 5,
      }),
      rec({
        id: "rec_fundraiser_compliance_review",
        recommendationType: "APPROVAL",
        title: "Request compliance review",
        description: "Contribution handling requires compliance approval.",
        confidence: 0.95,
        priority: "CRITICAL",
        reasons: ["Fundraising compliance rule"],
        action: "CREATE_APPROVAL",
        precedenceRank: 5,
      }),
      rec({
        id: "rec_fundraiser_limited_title",
        recommendationType: "VISIBILITY",
        title: "Use limited calendar title",
        description: "Avoid donor-identifying titles for limited viewers.",
        confidence: 0.9,
        priority: "HIGH",
        reasons: ["Donor confidentiality review"],
        action: "CHANGE_VALUE",
        fieldPath: "campaignDisplayTitle",
        precedenceRank: 8,
      }),
    ],
  },
  {
    id: "rule_debate_prep",
    category: "candidate",
    precedenceRank: 15,
    applies: (ctx) => /debate/i.test(ctx.eventType ?? ""),
    recommend: () => [
      rec({
        id: "rec_debate_mock",
        recommendationType: "PREP",
        title: "Schedule mock debate",
        description: "Debates require rehearsal and issue briefings.",
        confidence: 0.9,
        priority: "CRITICAL",
        reasons: ["Debate preparation rule"],
        action: "ADD_ITEM",
        precedenceRank: 15,
      }),
      rec({
        id: "rec_debate_rapid_response",
        recommendationType: "COMMUNICATIONS",
        title: "Stand up rapid-response team",
        description: "Post-debate communications must be ready.",
        confidence: 0.88,
        priority: "CRITICAL",
        reasons: ["Debate communications rule"],
        action: "ADD_ITEM",
        precedenceRank: 15,
      }),
    ],
  },
  {
    id: "rule_travel_buffer",
    category: "travel",
    precedenceRank: 12,
    applies: (ctx) => Boolean(ctx.travelRequired) || /travel|overnight/i.test(ctx.eventType ?? ""),
    recommend: (ctx) => [
      rec({
        id: "rec_travel_driver",
        recommendationType: "TRAVEL",
        title: "Confirm driver",
        description: "Required candidate travel needs an assigned driver.",
        confidence: 0.92,
        priority: "CRITICAL",
        reasons: ["Travel feasibility rule"],
        action: "REQUEST_INFORMATION",
        fieldPath: "driverUserId",
        precedenceRank: 12,
      }),
      rec({
        id: "rec_travel_buffer",
        recommendationType: "TRAVEL",
        title: "Add arrival buffer",
        description: "Protect candidate arrival with a travel buffer.",
        confidence: 0.85,
        priority: "HIGH",
        reasons: ["Travel buffer rule"],
        action: "CHANGE_VALUE",
        fieldPath: "arrivalAt",
        precedenceRank: 12,
      }),
      ...(ctx.overnight
        ? [
            rec({
              id: "rec_overnight_lodging",
              recommendationType: "TRAVEL",
              title: "Confirm lodging (protected details)",
              description: "Overnight travel needs lodging confirmation; keep details protected.",
              confidence: 0.9,
              priority: "HIGH",
              reasons: ["Overnight travel rule"],
              action: "REQUEST_INFORMATION",
              precedenceRank: 12,
            }),
          ]
        : []),
    ],
  },
  {
    id: "rule_press_messages",
    category: "communications",
    precedenceRank: 25,
    applies: (ctx) => /press|editorial|interview|television|radio/i.test(ctx.eventType ?? ""),
    recommend: () => [
      rec({
        id: "rec_press_three_messages",
        recommendationType: "COMMUNICATIONS",
        title: "Confirm three key messages",
        description: "Press interviews need message discipline.",
        confidence: 0.9,
        priority: "HIGH",
        reasons: ["Press interview rule"],
        action: "ADD_ITEM",
        precedenceRank: 25,
      }),
    ],
  },
  {
    id: "rule_social_recording",
    category: "communications",
    precedenceRank: 30,
    applies: (ctx) => /social media|podcast/i.test(ctx.eventType ?? ""),
    recommend: () => [
      rec({
        id: "rec_social_script",
        recommendationType: "COMMUNICATIONS",
        title: "Finalize script and publish deadline",
        description: "Recording sessions need script, edit owner, and approval deadline.",
        confidence: 0.86,
        priority: "HIGH",
        reasons: ["Social media recording rule"],
        action: "ADD_ITEM",
        precedenceRank: 30,
      }),
    ],
  },
  {
    id: "rule_county_visit",
    category: "operations",
    precedenceRank: 35,
    applies: (ctx) => /county/i.test(ctx.eventType ?? ""),
    recommend: () => [
      rec({
        id: "rec_county_briefing",
        recommendationType: "OPERATIONS",
        title: "Prepare county briefing",
        description: "County visits need local organizations, officials, and talking points.",
        confidence: 0.84,
        priority: "HIGH",
        reasons: ["County visit rule"],
        action: "ADD_ITEM",
        precedenceRank: 35,
      }),
    ],
  },
];
