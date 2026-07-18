import { defineWorkflow } from "./helpers";
import type { WorkflowDefinition } from "@/features/operational-intelligence/types/workflow-types";

function basePublic(slug: string, name: string, eventTypes: string[]): WorkflowDefinition {
  return defineWorkflow({
    id: `wf_${slug}`,
    version: 1,
    slug,
    name,
    description: `${name} operational workflow`,
    supportedCalendarTypes: ["PUBLIC_EVENTS", "COUNTY_ACTIVITY", "CANDIDATE"],
    supportedEventTypes: eventTypes,
    defaultDurationMinutes: 90,
    defaultArrivalBufferMinutes: 30,
    defaultSetupMinutes: 30,
    defaultBreakdownMinutes: 20,
    defaultObjectives: [
      {
        objectiveType: "MEET_VOTERS",
        isPrimary: true,
        description: "Engage voters and supporters",
        successDefinition: "Meaningful conversations and follow-ups captured",
      },
    ],
    defaultProgramFlow: [
      { sequence: 1, activityType: "ARRIVAL", title: "Arrival", durationMinutes: 10 },
      { sequence: 2, activityType: "HOST_GREETING", title: "Host greeting", durationMinutes: 10 },
      {
        sequence: 3,
        activityType: "CANDIDATE_REMARKS",
        title: "Candidate remarks",
        durationMinutes: 15,
      },
      { sequence: 4, activityType: "DEPARTURE", title: "Departure", durationMinutes: 10 },
    ],
    defaultPackingItems: [
      { category: "CAMPAIGN_MATERIAL", itemName: "Palm cards", quantity: 100 },
      { category: "CAMPAIGN_MATERIAL", itemName: "Business cards", quantity: 50 },
      { category: "SIGNAGE", itemName: "Campaign signs", quantity: 4 },
    ],
    defaultStaffingRoles: [
      { roleType: "EVENT_LEAD", required: true },
      { roleType: "CANDIDATE_LEAD", required: true },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "CONFIRM_HOST",
        title: "Confirm host and venue",
        offsetHoursBeforeStart: 168,
        priority: "HIGH",
      },
      {
        phase: "POST_EVENT",
        actionType: "THANK_YOU",
        title: "Send thank-you messages",
        offsetHoursBeforeStart: -24,
        priority: "MEDIUM",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "INTERNAL",
        communicationType: "REMINDER",
        audience: "Staff",
        offsetHoursBeforeStart: 24,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Is travel required?", required: true },
      { key: "driver", prompt: "Who is driving?", required: false },
    ],
    requiredInformation: [
      {
        fieldPath: "city",
        label: "City",
        severity: "HIGH",
        whyItMatters: "Staff and travel need a general location.",
      },
      {
        fieldPath: "candidateRole",
        label: "Candidate role",
        severity: "MEDIUM",
        whyItMatters: "Defines preparation and program flow.",
      },
    ],
    applicabilityRules: [{ field: "eventType", op: "in", value: eventTypes }],
  });
}

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  defineWorkflow({
    id: "wf_county_visit",
    version: 1,
    slug: "county-visit",
    name: "County Visit",
    description: "Multi-touch county engagement day",
    supportedCalendarTypes: ["COUNTY_ACTIVITY", "CANDIDATE", "TRAVEL"],
    supportedEventTypes: ["County Visit", "County Immersion"],
    defaultDurationMinutes: 240,
    defaultArrivalBufferMinutes: 45,
    defaultObjectives: [
      {
        objectiveType: "BUILD_RELATIONSHIPS",
        isPrimary: true,
        description: "Strengthen county relationships",
        successDefinition: "Local leaders engaged; follow-ups assigned",
      },
      {
        objectiveType: "MEET_VOTERS",
        description: "Meet voters across the county",
      },
    ],
    defaultProgramFlow: [
      { sequence: 1, activityType: "ARRIVAL", title: "County arrival", durationMinutes: 15 },
      {
        sequence: 2,
        activityType: "PRIVATE_BRIEFING",
        title: "Local briefing",
        durationMinutes: 20,
      },
      {
        sequence: 3,
        activityType: "LEADERSHIP_MEETING",
        title: "Local leader meetings",
        durationMinutes: 60,
      },
      {
        sequence: 4,
        activityType: "PHOTO_LINE",
        title: "Photos and greetings",
        durationMinutes: 20,
      },
      { sequence: 5, activityType: "DEPARTURE", title: "Departure", durationMinutes: 15 },
    ],
    defaultPackingItems: [
      { category: "CAMPAIGN_MATERIAL", itemName: "County-specific palm cards", quantity: 150 },
      { category: "SIGNAGE", itemName: "Yard signs", quantity: 10 },
      { category: "TECHNOLOGY", itemName: "Phone chargers", quantity: 2 },
      { category: "TECHNOLOGY", itemName: "Battery packs", quantity: 2 },
    ],
    defaultStaffingRoles: [
      { roleType: "EVENT_LEAD", required: true },
      { roleType: "TRAVEL_LEAD", required: true },
      { roleType: "DRIVER", required: true },
      { roleType: "PHOTOGRAPHER", required: false },
      { roleType: "VOLUNTEER_LEAD", required: false },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "COUNTY_BRIEFING",
        title: "Prepare county briefing",
        offsetHoursBeforeStart: 72,
        priority: "HIGH",
      },
      {
        phase: "PRE_EVENT",
        actionType: "LOCAL_CONTACTS",
        title: "Compile local organizations and elected officials",
        offsetHoursBeforeStart: 120,
        priority: "HIGH",
      },
      {
        phase: "POST_EVENT",
        actionType: "FOLLOWUP",
        title: "Assign county follow-ups",
        offsetHoursBeforeStart: -48,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "FACEBOOK",
        communicationType: "RECAP",
        audience: "Public",
        offsetHoursBeforeStart: -6,
      },
      {
        channel: "PRESS",
        communicationType: "PRESS_ADVISORY",
        audience: "County press",
        offsetHoursBeforeStart: 48,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Travel required?", required: true },
      { key: "multiStop", prompt: "Multiple stops planned?", required: true },
      { key: "overnight", prompt: "Overnight stay?", required: true },
    ],
    requiredInformation: [
      {
        fieldPath: "countyId",
        label: "County",
        severity: "CRITICAL",
        whyItMatters: "County visit requires a county assignment.",
        requiredBefore: "7 days before event",
      },
      {
        fieldPath: "travelPlans",
        label: "Travel plan",
        severity: "HIGH",
        whyItMatters: "Arrival timing depends on travel.",
      },
    ],
    applicabilityRules: [
      { field: "eventType", op: "in", value: ["County Visit", "County Immersion"] },
    ],
  }),

  defineWorkflow({
    id: "wf_festival_appearance",
    version: 1,
    slug: "festival-appearance",
    name: "Festival Appearance",
    description: "Outdoor festival / fair booth and greetings",
    supportedCalendarTypes: ["PUBLIC_EVENTS", "COUNTY_ACTIVITY", "VOLUNTEER"],
    supportedEventTypes: ["Festival", "Festival Appearance", "Fair"],
    defaultDurationMinutes: 180,
    defaultArrivalBufferMinutes: 45,
    defaultSetupMinutes: 45,
    defaultObjectives: [
      {
        objectiveType: "MEET_VOTERS",
        isPrimary: true,
        description: "Meet festival attendees",
        successDefinition: "High-quality conversations and volunteer signups",
      },
      { objectiveType: "CREATE_CONTENT", description: "Capture photos and social clips" },
    ],
    defaultProgramFlow: [
      { sequence: 1, activityType: "ARRIVAL", title: "Arrival and setup", durationMinutes: 30 },
      {
        sequence: 2,
        activityType: "VOLUNTEER_GREETING",
        title: "Volunteer greeting line",
        durationMinutes: 90,
      },
      { sequence: 3, activityType: "PHOTO_LINE", title: "Photos", durationMinutes: 20 },
      { sequence: 4, activityType: "DEPARTURE", title: "Breakdown and departure", durationMinutes: 20 },
    ],
    defaultPackingItems: [
      { category: "SIGNAGE", itemName: "Campaign tent", quantity: 1 },
      { category: "HOSPITALITY", itemName: "Tablecloth", quantity: 1 },
      { category: "SIGNAGE", itemName: "Banner", quantity: 1 },
      { category: "CAMPAIGN_MATERIAL", itemName: "Brochures", quantity: 200 },
      { category: "CAMPAIGN_MATERIAL", itemName: "Stickers", quantity: 200 },
      { category: "VOLUNTEER", itemName: "Volunteer signup QR code", quantity: 1 },
      { category: "VOLUNTEER", itemName: "Clipboards", quantity: 4 },
      { category: "VOLUNTEER", itemName: "Pens", quantity: 20 },
      { category: "HOSPITALITY", itemName: "Water", quantity: 24 },
      { category: "CANDIDATE_MATERIAL", itemName: "Campaign shirts", quantity: 4 },
      { category: "TECHNOLOGY", itemName: "Phone chargers", quantity: 2 },
      { category: "TECHNOLOGY", itemName: "Battery packs", quantity: 2 },
    ],
    defaultStaffingRoles: [
      { roleType: "EVENT_LEAD", required: true },
      { roleType: "VOLUNTEER_LEAD", required: true },
      { roleType: "PHOTOGRAPHER", required: true },
      { roleType: "COMMUNICATIONS_LEAD", required: false },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "WEATHER",
        title: "Outdoor-weather review",
        offsetHoursBeforeStart: 24,
        priority: "HIGH",
      },
      {
        phase: "PRE_EVENT",
        actionType: "PARKING",
        title: "Confirm parking and load-in",
        offsetHoursBeforeStart: 48,
        priority: "HIGH",
      },
      {
        phase: "POST_EVENT",
        actionType: "PHOTO_RECAP",
        title: "Post-event photo recap",
        offsetHoursBeforeStart: -6,
        priority: "MEDIUM",
      },
      {
        phase: "POST_EVENT",
        actionType: "THANK_HOST",
        title: "Thank host and volunteers",
        offsetHoursBeforeStart: -24,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "INSTAGRAM",
        communicationType: "PROMOTION",
        offsetHoursBeforeStart: 48,
      },
      {
        channel: "FACEBOOK",
        communicationType: "RECAP",
        offsetHoursBeforeStart: -4,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Travel required?", required: true },
      { key: "outdoor", prompt: "Outdoor weather-sensitive?", required: true },
    ],
    requiredInformation: [
      {
        fieldPath: "venueName",
        label: "Venue / festival name",
        severity: "HIGH",
        whyItMatters: "Setup team needs the festival site name.",
      },
    ],
    applicabilityRules: [
      { field: "eventType", op: "in", value: ["Festival", "Festival Appearance", "Fair"] },
    ],
  }),

  defineWorkflow({
    id: "wf_fundraiser",
    version: 1,
    slug: "fundraiser",
    name: "Fundraiser",
    description: "Fundraising reception or event with compliance controls",
    supportedCalendarTypes: ["FUNDRAISING", "CANDIDATE"],
    supportedEventTypes: ["Fundraiser", "Donor Meeting", "Donor Call Time"],
    defaultDurationMinutes: 120,
    defaultArrivalBufferMinutes: 20,
    readinessWeights: {
      "Basic Event Details": 6,
      "Date and Time": 6,
      Location: 6,
      "Candidate Role": 6,
      "Host and Contact": 8,
      Objectives: 4,
      "Program Flow": 6,
      Staffing: 8,
      Travel: 6,
      Packing: 4,
      Communications: 6,
      Approvals: 10,
      Compliance: 16,
      "Event-Day Preparation": 4,
      "Follow-Up Preparation": 4,
    },
    defaultObjectives: [
      {
        objectiveType: "RAISE_MONEY",
        isPrimary: true,
        description: "Raise campaign funds compliantly",
        successDefinition: "Host confirmed; contributions reconciled",
      },
    ],
    defaultProgramFlow: [
      { sequence: 1, activityType: "ARRIVAL", title: "Arrival", durationMinutes: 10 },
      {
        sequence: 2,
        activityType: "PRIVATE_BRIEFING",
        title: "Candidate briefing",
        durationMinutes: 15,
      },
      {
        sequence: 3,
        activityType: "HOST_GREETING",
        title: "Host greeting and introductions",
        durationMinutes: 15,
      },
      {
        sequence: 4,
        activityType: "CANDIDATE_REMARKS",
        title: "Candidate remarks",
        durationMinutes: 20,
      },
      { sequence: 5, activityType: "DEPARTURE", title: "Departure", durationMinutes: 10 },
    ],
    defaultPackingItems: [
      { category: "CAMPAIGN_MATERIAL", itemName: "Contribution instructions", quantity: 25 },
      { category: "CANDIDATE_MATERIAL", itemName: "Talking points", quantity: 1 },
    ],
    defaultStaffingRoles: [
      { roleType: "FINANCE_LEAD", required: true },
      { roleType: "COMPLIANCE_LEAD", required: true },
      { roleType: "EVENT_LEAD", required: true },
      { roleType: "CANDIDATE_LEAD", required: true },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "COMPLIANCE_REVIEW",
        title: "Compliance review",
        offsetHoursBeforeStart: 120,
        priority: "CRITICAL",
        requiresApproval: true,
      },
      {
        phase: "PRE_EVENT",
        actionType: "HOST_CONFIRM",
        title: "Host confirmation",
        offsetHoursBeforeStart: 72,
        priority: "HIGH",
      },
      {
        phase: "POST_EVENT",
        actionType: "RECONCILE",
        title: "Contribution reconciliation",
        offsetHoursBeforeStart: -48,
        priority: "CRITICAL",
        requiresApproval: true,
      },
      {
        phase: "POST_EVENT",
        actionType: "THANK_YOU",
        title: "Donor thank-you follow-up",
        offsetHoursBeforeStart: -24,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "EMAIL",
        communicationType: "THANK_YOU",
        audience: "Hosts",
        offsetHoursBeforeStart: -24,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Travel required?", required: true },
      {
        key: "privateLocation",
        prompt: "Is the venue a private residence?",
        required: true,
      },
    ],
    requiredInformation: [
      {
        fieldPath: "defaultVisibility",
        label: "Visibility",
        severity: "CRITICAL",
        whyItMatters: "Fundraising details must remain limited by default.",
      },
      {
        fieldPath: "financeLead",
        label: "Finance lead",
        severity: "CRITICAL",
        whyItMatters: "Compliance and reconciliation require ownership.",
      },
    ],
    applicabilityRules: [
      {
        field: "eventType",
        op: "in",
        value: ["Fundraiser", "Donor Meeting", "Donor Call Time"],
      },
    ],
  }),

  defineWorkflow({
    id: "wf_candidate_forum",
    version: 1,
    slug: "candidate-forum",
    name: "Candidate Forum",
    description: "Public candidate forum with issue prep",
    supportedCalendarTypes: ["PUBLIC_EVENTS", "CANDIDATE", "PRESS_MEDIA"],
    supportedEventTypes: ["Candidate Forum", "Town Hall"],
    defaultDurationMinutes: 120,
    defaultArrivalBufferMinutes: 40,
    defaultObjectives: [
      {
        objectiveType: "DELIVER_MESSAGE",
        isPrimary: true,
        description: "Communicate campaign priorities clearly",
      },
    ],
    defaultProgramFlow: [
      { sequence: 1, activityType: "ARRIVAL", title: "Arrival", durationMinutes: 15 },
      {
        sequence: 2,
        activityType: "PRIVATE_BRIEFING",
        title: "Issue briefing",
        durationMinutes: 20,
      },
      {
        sequence: 3,
        activityType: "CANDIDATE_REMARKS",
        title: "Opening remarks",
        durationMinutes: 10,
      },
      { sequence: 4, activityType: "QUESTIONS", title: "Audience Q&A", durationMinutes: 45 },
      {
        sequence: 5,
        activityType: "MEDIA_AVAILABILITY",
        title: "Media availability",
        durationMinutes: 15,
      },
      { sequence: 6, activityType: "DEPARTURE", title: "Departure", durationMinutes: 10 },
    ],
    defaultPackingItems: [
      { category: "CANDIDATE_MATERIAL", itemName: "Issue briefing binder", quantity: 1 },
      { category: "CAMPAIGN_MATERIAL", itemName: "Palm cards", quantity: 75 },
    ],
    defaultStaffingRoles: [
      { roleType: "CANDIDATE_LEAD", required: true },
      { roleType: "COMMUNICATIONS_LEAD", required: true },
      { roleType: "PRESS_LIAISON", required: true },
      { roleType: "PHOTOGRAPHER", required: true },
      { roleType: "VIDEOGRAPHER", required: false },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "ISSUE_BRIEF",
        title: "Issue briefing",
        offsetHoursBeforeStart: 72,
        priority: "CRITICAL",
      },
      {
        phase: "PRE_EVENT",
        actionType: "OPPONENT_RESEARCH",
        title: "Opponent research review",
        offsetHoursBeforeStart: 96,
        priority: "HIGH",
      },
      {
        phase: "PRE_EVENT",
        actionType: "RULES_REVIEW",
        title: "Forum rules review",
        offsetHoursBeforeStart: 48,
        priority: "HIGH",
      },
      {
        phase: "POST_EVENT",
        actionType: "RESPONSE_PLAN",
        title: "Post-event response plan",
        offsetHoursBeforeStart: -2,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "PRESS",
        communicationType: "PRESS_ADVISORY",
        offsetHoursBeforeStart: 48,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Travel required?", required: true },
    ],
    requiredInformation: [
      {
        fieldPath: "candidateRole",
        label: "Candidate role",
        severity: "HIGH",
        whyItMatters: "Preparation depends on speaking format.",
      },
    ],
    applicabilityRules: [
      { field: "eventType", op: "in", value: ["Candidate Forum", "Town Hall"] },
    ],
  }),

  defineWorkflow({
    id: "wf_debate",
    version: 1,
    slug: "debate",
    name: "Debate",
    description: "Debate preparation and event-day operations",
    supportedCalendarTypes: ["DEBATE_PREP", "CANDIDATE", "COMMUNICATIONS"],
    supportedEventTypes: ["Debate"],
    defaultDurationMinutes: 120,
    defaultArrivalBufferMinutes: 60,
    defaultObjectives: [
      {
        objectiveType: "PREPARE_CANDIDATE",
        isPrimary: true,
        description: "Prepare and deliver debate performance",
      },
    ],
    defaultProgramFlow: [
      {
        sequence: 1,
        activityType: "PRIVATE_BRIEFING",
        title: "Green room prep",
        durationMinutes: 30,
      },
      {
        sequence: 2,
        activityType: "CANDIDATE_REMARKS",
        title: "Debate program",
        durationMinutes: 90,
      },
      {
        sequence: 3,
        activityType: "MEDIA_AVAILABILITY",
        title: "Post-debate media",
        durationMinutes: 20,
      },
    ],
    defaultPackingItems: [
      { category: "CANDIDATE_MATERIAL", itemName: "Opening statement", quantity: 1 },
      { category: "CANDIDATE_MATERIAL", itemName: "Closing statement", quantity: 1 },
      { category: "CANDIDATE_MATERIAL", itemName: "Issue briefings", quantity: 1 },
      { category: "PERSONAL", itemName: "Green-room materials", quantity: 1 },
    ],
    defaultStaffingRoles: [
      { roleType: "CANDIDATE_LEAD", required: true },
      { roleType: "COMMUNICATIONS_LEAD", required: true },
      { roleType: "PRESS_LIAISON", required: true },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "MOCK_DEBATE",
        title: "Mock debate",
        offsetHoursBeforeStart: 72,
        priority: "CRITICAL",
      },
      {
        phase: "PRE_EVENT",
        actionType: "WARDROBE",
        title: "Candidate clothing review",
        offsetHoursBeforeStart: 24,
        priority: "MEDIUM",
      },
      {
        phase: "EVENT_DAY",
        actionType: "RAPID_RESPONSE",
        title: "Rapid-response team ready",
        offsetHoursBeforeStart: 2,
        priority: "CRITICAL",
      },
      {
        phase: "POST_EVENT",
        actionType: "POST_DEBATE_COMMS",
        title: "Post-debate communications",
        offsetHoursBeforeStart: -1,
        priority: "CRITICAL",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "X",
        communicationType: "RAPID_RESPONSE",
        offsetHoursBeforeStart: 0,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Travel required?", required: true },
      { key: "buffer", prompt: "Extra travel buffer confirmed?", required: true },
    ],
    requiredInformation: [
      {
        fieldPath: "arrivalAt",
        label: "Arrival time",
        severity: "CRITICAL",
        whyItMatters: "Debate green-room timing depends on arrival.",
      },
    ],
    applicabilityRules: [{ field: "eventType", op: "eq", value: "Debate" }],
  }),

  defineWorkflow({
    id: "wf_press_interview",
    version: 1,
    slug: "press-interview",
    name: "Press Interview",
    description: "Press interview message discipline and logistics",
    supportedCalendarTypes: ["PRESS_MEDIA", "COMMUNICATIONS", "CANDIDATE"],
    supportedEventTypes: ["Press Interview", "Editorial Board Meeting", "Press Conference"],
    defaultDurationMinutes: 45,
    defaultArrivalBufferMinutes: 20,
    defaultObjectives: [
      {
        objectiveType: "EARN_MEDIA",
        isPrimary: true,
        description: "Deliver three key messages",
      },
    ],
    defaultProgramFlow: [
      {
        sequence: 1,
        activityType: "PRIVATE_BRIEFING",
        title: "Message briefing",
        durationMinutes: 15,
      },
      {
        sequence: 2,
        activityType: "MEDIA_AVAILABILITY",
        title: "Interview",
        durationMinutes: 30,
      },
    ],
    defaultPackingItems: [
      { category: "CANDIDATE_MATERIAL", itemName: "Three key messages card", quantity: 1 },
    ],
    defaultStaffingRoles: [
      { roleType: "PRESS_LIAISON", required: true },
      { roleType: "COMMUNICATIONS_LEAD", required: true },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "KEY_MESSAGES",
        title: "Confirm three key messages",
        offsetHoursBeforeStart: 24,
        priority: "CRITICAL",
      },
      {
        phase: "PRE_EVENT",
        actionType: "RISK_QUESTIONS",
        title: "Prepare likely and risk questions",
        offsetHoursBeforeStart: 24,
        priority: "HIGH",
      },
      {
        phase: "POST_EVENT",
        actionType: "CLIP_COLLECTION",
        title: "Collect clips and monitor response",
        offsetHoursBeforeStart: -4,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "PRESS",
        communicationType: "TALKING_POINTS",
        offsetHoursBeforeStart: 12,
      },
    ],
    defaultTravelQuestions: [
      { key: "travelRequired", prompt: "Travel required?", required: false },
    ],
    requiredInformation: [
      {
        fieldPath: "objective",
        label: "Message objective",
        severity: "HIGH",
        whyItMatters: "Interview prep requires a clear objective.",
      },
    ],
    applicabilityRules: [
      {
        field: "eventType",
        op: "in",
        value: ["Press Interview", "Editorial Board Meeting", "Press Conference"],
      },
    ],
  }),

  defineWorkflow({
    id: "wf_social_media_recording",
    version: 1,
    slug: "social-media-recording",
    name: "Social Media Recording",
    description: "Recording session with script, capture, and publish deadlines",
    supportedCalendarTypes: ["SOCIAL_MEDIA", "COMMUNICATIONS"],
    supportedEventTypes: ["Social Media Recording", "Podcast Appearance"],
    defaultDurationMinutes: 60,
    defaultObjectives: [
      {
        objectiveType: "CREATE_CONTENT",
        isPrimary: true,
        description: "Produce publishable content",
      },
    ],
    defaultProgramFlow: [
      { sequence: 1, activityType: "ARRIVAL", title: "Setup", durationMinutes: 15 },
      {
        sequence: 2,
        activityType: "CANDIDATE_REMARKS",
        title: "Recording",
        durationMinutes: 30,
      },
      { sequence: 3, activityType: "DEPARTURE", title: "Wrap", durationMinutes: 10 },
    ],
    defaultPackingItems: [
      { category: "TECHNOLOGY", itemName: "Microphone", quantity: 1 },
      { category: "TECHNOLOGY", itemName: "Tripod", quantity: 1 },
      { category: "CANDIDATE_MATERIAL", itemName: "Script / talking points", quantity: 1 },
    ],
    defaultStaffingRoles: [
      { roleType: "COMMUNICATIONS_LEAD", required: true },
      { roleType: "VIDEOGRAPHER", required: true },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "SCRIPT",
        title: "Finalize script",
        offsetHoursBeforeStart: 24,
        priority: "HIGH",
      },
      {
        phase: "PRE_EVENT",
        actionType: "WARDROBE",
        title: "Wardrobe review",
        offsetHoursBeforeStart: 12,
        priority: "MEDIUM",
      },
      {
        phase: "POST_EVENT",
        actionType: "EDIT_APPROVE",
        title: "Edit and approve publish package",
        offsetHoursBeforeStart: -24,
        priority: "HIGH",
        requiresApproval: true,
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "INSTAGRAM",
        communicationType: "VIDEO",
        offsetHoursBeforeStart: -48,
      },
      {
        channel: "FACEBOOK",
        communicationType: "VIDEO",
        offsetHoursBeforeStart: -48,
      },
    ],
    defaultTravelQuestions: [],
    requiredInformation: [
      {
        fieldPath: "publishAt",
        label: "Publication deadline",
        severity: "HIGH",
        whyItMatters: "Editing and approval must finish before publish.",
      },
    ],
    applicabilityRules: [
      {
        field: "eventType",
        op: "in",
        value: ["Social Media Recording", "Podcast Appearance"],
      },
    ],
  }),

  defineWorkflow({
    id: "wf_volunteer_canvass",
    version: 1,
    slug: "volunteer-canvass-launch",
    name: "Volunteer Canvass Launch",
    description: "Volunteer canvass or phone-bank launch",
    supportedCalendarTypes: ["VOLUNTEER", "FIELD", "PUBLIC_EVENTS"],
    supportedEventTypes: ["Volunteer Canvass Launch", "Phone Bank", "Door-Knocking Event"],
    defaultDurationMinutes: 180,
    defaultObjectives: [
      {
        objectiveType: "RECRUIT_VOLUNTEERS",
        isPrimary: true,
        description: "Launch volunteer activity",
      },
    ],
    defaultProgramFlow: [
      {
        sequence: 1,
        activityType: "VOLUNTEER_GREETING",
        title: "Volunteer briefing",
        durationMinutes: 20,
      },
      {
        sequence: 2,
        activityType: "CUSTOM",
        title: "Canvass / phone bank",
        durationMinutes: 120,
      },
      { sequence: 3, activityType: "FOLLOWUP", title: "Debrief", durationMinutes: 20 },
    ],
    defaultPackingItems: [
      { category: "VOLUNTEER", itemName: "Walk lists / call lists", quantity: 1 },
      { category: "CAMPAIGN_MATERIAL", itemName: "Palm cards", quantity: 200 },
      { category: "VOLUNTEER", itemName: "Clipboards", quantity: 10 },
    ],
    defaultStaffingRoles: [
      { roleType: "VOLUNTEER_LEAD", required: true },
      { roleType: "EVENT_LEAD", required: true },
    ],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "LISTS",
        title: "Prepare volunteer lists",
        offsetHoursBeforeStart: 48,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "SMS",
        communicationType: "REMINDER",
        audience: "Volunteers",
        offsetHoursBeforeStart: 24,
      },
    ],
    defaultTravelQuestions: [],
    requiredInformation: [],
    applicabilityRules: [
      {
        field: "eventType",
        op: "in",
        value: ["Volunteer Canvass Launch", "Phone Bank", "Door-Knocking Event"],
      },
    ],
  }),

  defineWorkflow({
    id: "wf_travel_block",
    version: 1,
    slug: "travel-block",
    name: "Travel Block",
    description: "Travel-only or overnight travel block",
    supportedCalendarTypes: ["TRAVEL", "CANDIDATE"],
    supportedEventTypes: ["Travel Block", "Overnight Travel"],
    defaultDurationMinutes: 120,
    readinessWeights: {
      "Basic Event Details": 8,
      "Date and Time": 10,
      Location: 8,
      "Candidate Role": 2,
      "Host and Contact": 2,
      Objectives: 2,
      "Program Flow": 2,
      Staffing: 10,
      Travel: 30,
      Packing: 10,
      Communications: 2,
      Approvals: 4,
      Compliance: 2,
      "Event-Day Preparation": 4,
      "Follow-Up Preparation": 4,
    },
    defaultObjectives: [
      {
        objectiveType: "INTERNAL_COORDINATION",
        isPrimary: true,
        description: "Move candidate safely and on time",
      },
    ],
    defaultProgramFlow: [
      {
        sequence: 1,
        activityType: "TRAVEL_TRANSITION",
        title: "Travel segment",
        durationMinutes: 120,
      },
    ],
    defaultPackingItems: [
      { category: "PERSONAL", itemName: "Candidate essentials", quantity: 1 },
      { category: "WEATHER", itemName: "Weather kit", quantity: 1 },
    ],
    defaultStaffingRoles: [
      { roleType: "DRIVER", required: true },
      { roleType: "TRAVEL_LEAD", required: true },
    ],
    defaultActionItems: [
      {
        phase: "TRAVEL",
        actionType: "CONFIRM_DRIVER",
        title: "Confirm driver and vehicle",
        offsetHoursBeforeStart: 24,
        priority: "CRITICAL",
      },
      {
        phase: "TRAVEL",
        actionType: "NEXT_DAY_CHECK",
        title: "Next-day schedule check",
        offsetHoursBeforeStart: -12,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [],
    defaultTravelQuestions: [
      { key: "origin", prompt: "Origin?", required: true },
      { key: "destination", prompt: "Destination?", required: true },
      { key: "overnight", prompt: "Overnight lodging required?", required: true },
      { key: "hotel", prompt: "Hotel confirmed?", required: false },
    ],
    requiredInformation: [
      {
        fieldPath: "departureAt",
        label: "Departure time",
        severity: "CRITICAL",
        whyItMatters: "Travel blocks require a departure time.",
      },
      {
        fieldPath: "driverUserId",
        label: "Driver",
        severity: "CRITICAL",
        whyItMatters: "Candidate travel requires an assigned driver.",
      },
    ],
    applicabilityRules: [
      { field: "eventType", op: "in", value: ["Travel Block", "Overnight Travel"] },
    ],
  }),

  defineWorkflow({
    id: "wf_internal_meeting",
    version: 1,
    slug: "internal-campaign-meeting",
    name: "Internal Campaign Meeting",
    description: "Internal staff planning meeting",
    supportedCalendarTypes: ["INTERNAL_MEETINGS", "STAFF_WORK"],
    supportedEventTypes: ["Internal Campaign Meeting", "Staff Planning Meeting"],
    defaultDurationMinutes: 60,
    defaultObjectives: [
      {
        objectiveType: "INTERNAL_COORDINATION",
        isPrimary: true,
        description: "Coordinate campaign operations",
      },
    ],
    defaultProgramFlow: [
      {
        sequence: 1,
        activityType: "LEADERSHIP_MEETING",
        title: "Agenda and decisions",
        durationMinutes: 60,
      },
    ],
    defaultPackingItems: [],
    defaultStaffingRoles: [{ roleType: "EVENT_LEAD", required: true }],
    defaultActionItems: [
      {
        phase: "PRE_EVENT",
        actionType: "AGENDA",
        title: "Publish agenda",
        offsetHoursBeforeStart: 24,
        priority: "MEDIUM",
      },
      {
        phase: "POST_EVENT",
        actionType: "NOTES",
        title: "Distribute decisions and owners",
        offsetHoursBeforeStart: -4,
        priority: "HIGH",
      },
    ],
    defaultCommunicationsItems: [
      {
        channel: "INTERNAL",
        communicationType: "REMINDER",
        offsetHoursBeforeStart: 12,
      },
    ],
    defaultTravelQuestions: [],
    requiredInformation: [],
    applicabilityRules: [
      {
        field: "eventType",
        op: "in",
        value: ["Internal Campaign Meeting", "Staff Planning Meeting"],
      },
    ],
  }),

  defineWorkflow({
    id: "wf_protected_personal",
    version: 1,
    slug: "protected-personal-time",
    name: "Protected Personal Time",
    description: "Minimal operational planning; busy-only by default",
    supportedCalendarTypes: ["PROTECTED_PERSONAL"],
    supportedEventTypes: ["Protected Personal Time", "Protected Personal Appointment"],
    defaultDurationMinutes: 60,
    readinessWeights: {
      "Basic Event Details": 20,
      "Date and Time": 30,
      Location: 5,
      "Candidate Role": 5,
      "Host and Contact": 5,
      Objectives: 5,
      "Program Flow": 5,
      Staffing: 5,
      Travel: 5,
      Packing: 5,
      Communications: 0,
      Approvals: 5,
      Compliance: 0,
      "Event-Day Preparation": 5,
      "Follow-Up Preparation": 0,
    },
    defaultObjectives: [],
    defaultProgramFlow: [],
    defaultPackingItems: [],
    defaultStaffingRoles: [],
    defaultActionItems: [],
    defaultCommunicationsItems: [],
    defaultTravelQuestions: [],
    requiredInformation: [
      {
        fieldPath: "startsAt",
        label: "Start time",
        severity: "CRITICAL",
        whyItMatters: "Protected time must block the calendar.",
      },
    ],
    applicabilityRules: [
      {
        field: "eventType",
        op: "in",
        value: ["Protected Personal Time", "Protected Personal Appointment"],
      },
    ],
  }),

  // Additional named workflows (lean but registered)
  ...[
    ["county-immersion", "County Immersion", ["County Immersion"]],
    ["parade", "Parade", ["Parade"]],
    ["donor-meeting", "Donor Meeting", ["Donor Meeting"]],
    ["donor-call-time", "Donor Call Time", ["Donor Call Time"]],
    ["town-hall", "Town Hall", ["Town Hall"]],
    ["community-meeting", "Community Meeting", ["Community Meeting"]],
    ["civic-club-meeting", "Civic Club Meeting", ["Civic Club Meeting"]],
    ["church-faith-event", "Church or Faith Event", ["Church or Faith Event"]],
    ["university-college-event", "University or College Event", ["University or College Event"]],
    ["school-event", "School Event", ["School Event"]],
    ["business-visit", "Business Visit", ["Business Visit"]],
    ["farm-visit", "Farm Visit", ["Farm Visit"]],
    ["editorial-board-meeting", "Editorial Board Meeting", ["Editorial Board Meeting"]],
    ["press-conference", "Press Conference", ["Press Conference"]],
    ["television-appearance", "Television Appearance", ["Television Appearance"]],
    ["radio-interview", "Radio Interview", ["Radio Interview"]],
    ["podcast-appearance", "Podcast Appearance", ["Podcast Appearance"]],
    ["phone-bank", "Phone Bank", ["Phone Bank"]],
    ["door-knocking-event", "Door-Knocking Event", ["Door-Knocking Event"]],
    ["rally", "Rally", ["Rally"]],
    ["reception", "Reception", ["Reception"]],
    ["conference", "Conference", ["Conference"]],
    ["staff-planning-meeting", "Staff Planning Meeting", ["Staff Planning Meeting"]],
    ["overnight-travel", "Overnight Travel", ["Overnight Travel"]],
    ["compliance-deadline", "Compliance Deadline", ["Compliance Deadline"]],
    ["surrogate-event", "Surrogate Event", ["Surrogate Event"]],
  ].map(([slug, name, types]) =>
    basePublic(slug as string, name as string, types as string[]),
  ),
];
