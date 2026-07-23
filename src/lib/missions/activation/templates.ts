/**
 * Standard Event Activation playbook — versioned campaign template (data, not hard-coded in UI).
 * External actions remain blocked; tasks are internal work only.
 */

import type { PlaybookLevel, TemplateStepDef } from "@/lib/missions/activation/types";
import {
  STANDARD_TEMPLATE_CODE,
  STANDARD_TEMPLATE_VERSION,
} from "@/lib/missions/activation/types";

export type PlaybookTemplateDef = {
  code: string;
  version: string;
  title: string;
  description: string;
  playbookLevel: PlaybookLevel;
  steps: TemplateStepDef[];
};

const std = (
  partial: TemplateStepDef,
): TemplateStepDef => ({
  required: true,
  defaultPriority: "NORMAL",
  ...partial,
});

/** Minimal / calendar-only — Event basics + follow-up hook. */
export const MINIMAL_TEMPLATE: PlaybookTemplateDef = {
  code: "MINIMAL_CALENDAR_ONLY",
  version: "1.0.0",
  title: "Minimal / calendar only",
  description: "Confirm Event basics and assign hot-wash owner. No department blast.",
  playbookLevel: "MINIMAL",
  steps: [
    std({
      stepKey: "confirm_event_basics",
      department: "EVENTS",
      workstream: "EVENT_MANAGEMENT",
      title: "Confirm Event basics",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 10,
    }),
    std({
      stepKey: "hot_wash_owner",
      department: "EVENTS",
      workstream: "FOLLOW_UP",
      title: "Assign hot-wash / outcome review owner",
      instructions: "Links to IC-02A Event Outcome after Event end.",
      timingAnchor: "EVENT_END",
      offsetHours: 1,
      sortOrder: 900,
    }),
  ],
};

/** Full standard timeline per IC-02B §6. */
export const STANDARD_TEMPLATE: PlaybookTemplateDef = {
  code: STANDARD_TEMPLATE_CODE,
  version: STANDARD_TEMPLATE_VERSION,
  title: "Standard event activation",
  description:
    "Coordinated department work from activation through day-of and IC-02A hot wash. No silent external send/publish/purchase.",
  playbookLevel: "STANDARD",
  steps: [
    // Immediately after setup
    std({
      stepKey: "confirm_event_basics",
      department: "EVENTS",
      workstream: "EVENT_MANAGEMENT",
      title: "Confirm Event basics",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 10,
    }),
    std({
      stepKey: "confirm_public_private",
      department: "EVENTS",
      workstream: "EVENT_MANAGEMENT",
      title: "Confirm public/private posture",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 20,
    }),
    std({
      stepKey: "confirm_address_redaction",
      department: "EVENTS",
      workstream: "EVENT_MANAGEMENT",
      title: "Confirm address-redaction policy",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 30,
    }),
    std({
      stepKey: "identify_hosts_partners",
      department: "EVENTS",
      workstream: "HOSTS_AND_PARTNERS",
      title: "Identify host and partners",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 40,
    }),
    std({
      stepKey: "identify_audience_geo",
      department: "COMMUNICATIONS",
      workstream: "COMMUNICATIONS",
      title: "Identify audience geography",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      requiresGeographyRadius: true,
      sortOrder: 50,
    }),
    std({
      stepKey: "request_graphic",
      department: "GRAPHICS",
      workstream: "GRAPHIC_DESIGN",
      title: "Request graphic",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 60,
    }),
    std({
      stepKey: "request_social_setup",
      department: "SOCIAL_MEDIA",
      workstream: "SOCIAL_MEDIA",
      title: "Request social Event/content setup",
      instructions: "Internal brief only — do not publish without approval + provider.",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      requiresContentApproval: true,
      sortOrder: 70,
    }),
    std({
      stepKey: "partner_packet",
      department: "EVENTS",
      workstream: "HOSTS_AND_PARTNERS",
      title: "Prepare partner/co-host information packet",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 80,
    }),
    std({
      stepKey: "identify_volunteer_needs",
      department: "VOLUNTEER_MANAGEMENT",
      workstream: "VOLUNTEER_RECRUITMENT",
      title: "Identify volunteer needs",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      volunteerEligible: true,
      createVolunteerNeed: true,
      sortOrder: 90,
    }),
    std({
      stepKey: "assess_travel_lodging_dining",
      department: "LOGISTICS",
      workstream: "LOGISTICS",
      title: "Assess travel, lodging, dining, and materials",
      instructions: "Route to existing Travel/Logistics/Field Ops facts — do not duplicate state machines.",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 0,
      sortOrder: 100,
    }),

    // Within 48 hours of activation
    std({
      stepKey: "prepare_save_the_date",
      department: "COMMUNICATIONS",
      workstream: "EMAIL",
      title: "Prepare Save-the-Date Email",
      instructions:
        "Deadline = within 48 hours of activation (not Event creation). Prepare and approve only — D20 dispatch remains blocked until content/audience/consent/provider satisfied.",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 48,
      requiresContentApproval: true,
      requiresAudienceApproval: true,
      requiresConsent: true,
      requiresExternalProvider: true,
      sortOrder: 200,
    }),

    // As early as possible (activation + 24h planning window)
    std({
      stepKey: "graphic_design_brief",
      department: "GRAPHICS",
      workstream: "GRAPHIC_DESIGN",
      title: "Create graphic design brief",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 24,
      sortOrder: 210,
    }),
    std({
      stepKey: "social_content_brief",
      department: "SOCIAL_MEDIA",
      workstream: "SOCIAL_MEDIA",
      title: "Create social-media Event/content brief",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 24,
      requiresContentApproval: true,
      sortOrder: 220,
    }),
    std({
      stepKey: "verify_mobilize_rsvp",
      department: "EVENTS",
      workstream: "EVENT_MANAGEMENT",
      title: "Confirm Mobilize/public RSVP link",
      timingAnchor: "ACTIVATION_APPLIED",
      offsetHours: 24,
      sortOrder: 230,
    }),

    // One week before Event
    std({
      stepKey: "participation_reminder",
      department: "COMMUNICATIONS",
      workstream: "EMAIL",
      title: "Prepare participation reminder",
      timingAnchor: "EVENT_START",
      offsetHours: -7 * 24,
      requiresContentApproval: true,
      requiresAudienceApproval: true,
      requiresConsent: true,
      requiresExternalProvider: true,
      sortOrder: 300,
    }),
    std({
      stepKey: "volunteer_request_email",
      department: "COMMUNICATIONS",
      workstream: "EMAIL",
      title: "Prepare volunteer request",
      timingAnchor: "EVENT_START",
      offsetHours: -7 * 24,
      requiresContentApproval: true,
      requiresConsent: true,
      sortOrder: 310,
    }),
    std({
      stepKey: "phone_bank_audience",
      department: "PHONE_BANK",
      workstream: "PHONE_BANK",
      title: "Define authorized phone-bank audience & radius",
      instructions: "Geography is planning input only — does not authorize contact.",
      timingAnchor: "EVENT_START",
      offsetHours: -7 * 24,
      requiresConsent: true,
      requiresGeographyRadius: true,
      sortOrder: 320,
    }),
    std({
      stepKey: "phone_bank_script",
      department: "PHONE_BANK",
      workstream: "PHONE_BANK",
      title: "Prepare approved call script",
      timingAnchor: "EVENT_START",
      offsetHours: -7 * 24,
      requiresContentApproval: true,
      sortOrder: 330,
    }),
    std({
      stepKey: "digital_ads_plan",
      department: "DIGITAL",
      workstream: "DIGITAL_ADVERTISING",
      title: "Prepare digital advertising plan (internal only)",
      instructions: "Selecting tactics creates tasks only — does not purchase placements.",
      timingAnchor: "EVENT_START",
      offsetHours: -7 * 24,
      requiresContentApproval: true,
      sortOrder: 340,
    }),

    // Weekend before
    std({
      stepKey: "field_canvass_turf",
      department: "FIELD_CANVASS",
      workstream: "DOOR_HANGER_CANVASSING",
      title: "Define canvass turf & door-hanger plan",
      instructions: "Do not invent household targets or voter data.",
      timingAnchor: "WEEKEND_BEFORE_EVENT",
      offsetHours: 0,
      volunteerEligible: true,
      createVolunteerNeed: true,
      requiresGeographyRadius: true,
      sortOrder: 400,
    }),

    // 1–2 days before — texting via D20
    std({
      stepKey: "prepare_texting",
      department: "TEXTING",
      workstream: "SMS_TEXTING",
      title: "Prepare texting (queue through D20)",
      instructions:
        "Verify consent & suppressions. Dispatch only through verified enabled provider. Never label SENT without verified evidence.",
      timingAnchor: "EVENT_START",
      offsetHours: -36,
      requiresConsent: true,
      requiresContentApproval: true,
      requiresAudienceApproval: true,
      requiresExternalProvider: true,
      sortOrder: 500,
    }),

    // Day of
    std({
      stepKey: "day_of_candidate_prep",
      department: "CANDIDATE",
      workstream: "EVENT_MANAGEMENT",
      title: "Candidate prep",
      timingAnchor: "EVENT_START",
      offsetHours: -3,
      sortOrder: 600,
    }),
    std({
      stepKey: "day_of_host_confirm",
      department: "EVENTS",
      workstream: "HOSTS_AND_PARTNERS",
      title: "Host confirmation",
      timingAnchor: "EVENT_START",
      offsetHours: -3,
      sortOrder: 610,
    }),
    std({
      stepKey: "day_of_volunteer_checkin",
      department: "VOLUNTEER_MANAGEMENT",
      workstream: "VOLUNTEER_RECRUITMENT",
      title: "Volunteer check-in readiness",
      timingAnchor: "EVENT_START",
      offsetHours: -2,
      volunteerEligible: true,
      sortOrder: 620,
    }),
    std({
      stepKey: "day_of_field_ops_handoff",
      department: "LOGISTICS",
      workstream: "LOGISTICS",
      title: "Field Ops handoff",
      timingAnchor: "EVENT_START",
      offsetHours: -1,
      sortOrder: 630,
    }),

    // After Event → IC-02A
    std({
      stepKey: "outcome_review",
      department: "EVENTS",
      workstream: "FOLLOW_UP",
      title: "Complete Event outcome review (IC-02A)",
      instructions: "Open Event Outcome / Hot Wash. Time passing does not auto-complete.",
      timingAnchor: "EVENT_END",
      offsetHours: 2,
      sortOrder: 700,
    }),
    std({
      stepKey: "hot_wash_takeaways",
      department: "EVENTS",
      workstream: "FOLLOW_UP",
      title: "Hot wash takeaways & people met",
      timingAnchor: "EVENT_END",
      offsetHours: 4,
      sortOrder: 710,
    }),
  ],
};

export const MAJOR_TEMPLATE: PlaybookTemplateDef = {
  ...STANDARD_TEMPLATE,
  code: "MAJOR_EVENT_ACTIVATION",
  version: "1.0.0",
  title: "Major event activation",
  description: "Standard steps plus press, radio/newspaper, and fundraising support.",
  playbookLevel: "MAJOR",
  steps: [
    ...STANDARD_TEMPLATE.steps,
    std({
      stepKey: "press_placement",
      department: "PRESS",
      workstream: "ARKANSAS_PRESS_ASSOCIATION",
      title: "Prepare Arkansas Press Association / press placement request",
      instructions: "Internal task only — does not purchase or publish.",
      timingAnchor: "EVENT_START",
      offsetHours: -10 * 24,
      requiresContentApproval: true,
      sortOrder: 350,
    }),
    std({
      stepKey: "fundraising_soft_ask",
      department: "FUNDRAISING",
      workstream: "FUNDRAISING_SUPPORT",
      title: "Prepare soft fundraising language (if approved)",
      timingAnchor: "EVENT_START",
      offsetHours: -7 * 24,
      requiresContentApproval: true,
      requiresConsent: true,
      sortOrder: 315,
    }),
  ],
};

export const PLAYBOOK_CATALOG: PlaybookTemplateDef[] = [
  {
    code: "NO_ACTIVATION",
    version: "1.0.0",
    title: "No activation work",
    description: "Creates no department tasks.",
    playbookLevel: "NONE",
    steps: [],
  },
  MINIMAL_TEMPLATE,
  STANDARD_TEMPLATE,
  MAJOR_TEMPLATE,
];

export function getTemplateByLevel(level: PlaybookLevel): PlaybookTemplateDef {
  if (level === "NONE") return PLAYBOOK_CATALOG[0]!;
  if (level === "MINIMAL") return MINIMAL_TEMPLATE;
  if (level === "MAJOR" || level === "CUSTOM") return MAJOR_TEMPLATE;
  return STANDARD_TEMPLATE;
}

export function recommendPlaybookLevel(input: {
  expectedAttendance?: number | null;
  isMultiDay?: boolean;
  hasMission?: boolean;
}): PlaybookLevel {
  if (!input.hasMission) return "NONE";
  if (input.isMultiDay || (input.expectedAttendance ?? 0) >= 100) return "MAJOR";
  if ((input.expectedAttendance ?? 0) >= 25) return "STANDARD";
  return "MINIMAL";
}
