import {
  checkboxList,
  packingList,
  EVENT_DAY_ACTIONS,
  POST_EVENT_ACTIONS,
  PRE_EVENT_ACTIONS,
  PROGRAM_FLOW_PRESETS,
  STANDARD_PACKING,
} from "@/features/event-drafts/checklist-presets";
import type { StagedEventDraft } from "@/features/event-drafts/draft-types";

export type EventPresetId =
  | "county_visit"
  | "festival"
  | "fundraiser"
  | "candidate_forum"
  | "debate"
  | "press_interview"
  | "social_recording"
  | "volunteer_canvass"
  | "community_meeting"
  | "donor_call_time"
  | "travel_block"
  | "internal_meeting"
  | "personal_protected";

export type EventPreset = {
  id: EventPresetId;
  label: string;
  primaryCalendar: string;
  eventType: string;
  durationPreset: string;
  defaults: Partial<StagedEventDraft>;
};

function baseFlow() {
  return PROGRAM_FLOW_PRESETS.slice(0, 6).map((activity, index) => ({
    id: `flow_${index}`,
    sequence: index + 1,
    activity,
    completionStatus: "PENDING",
  }));
}

export const EVENT_PRESETS: EventPreset[] = [
  {
    id: "county_visit",
    label: "County visit",
    primaryCalendar: "County Activity",
    eventType: "Community meeting",
    durationPreset: "2 hours",
    defaults: {
      packingItems: packingList(STANDARD_PACKING),
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
      programFlow: baseFlow(),
      travelPlan: { candidateTravelRequired: true, staffTravelRequired: true },
    },
  },
  {
    id: "festival",
    label: "Festival appearance",
    primaryCalendar: "Public Events",
    eventType: "Festival",
    durationPreset: "2 hours",
    defaults: {
      packingItems: packingList([
        "Palm cards",
        "Banner",
        "Campaign signs",
        "Water",
        "Phone chargers",
      ]),
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
      programFlow: baseFlow(),
      people: { photographerNeeded: true, communicationsNeeded: true },
    },
  },
  {
    id: "fundraiser",
    label: "Fundraiser",
    primaryCalendar: "Fundraising",
    eventType: "Fundraiser",
    durationPreset: "2 hours",
    defaults: {
      packingItems: packingList([
        "Contribution forms",
        "Business cards",
        "Name tags",
        "Pens",
      ]),
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
      people: { financeNeeded: true, complianceNeeded: true },
      visibility: {
        locationDisclosure: "CITY",
        generalVisibility: "Calendar team",
        showCalendarName: true,
        showSafeTitle: true,
        showGeneralLocation: true,
        showStartEnd: true,
        hideProtectedDetails: true,
      },
    },
  },
  {
    id: "candidate_forum",
    label: "Candidate forum",
    primaryCalendar: "Public Events",
    eventType: "Candidate forum",
    durationPreset: "90 minutes",
    defaults: {
      packingItems: packingList(["Palm cards", "Business cards", "Water"]),
      programFlow: baseFlow(),
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
    },
  },
  {
    id: "debate",
    label: "Debate",
    primaryCalendar: "Debate Preparation",
    eventType: "Debate",
    durationPreset: "3 hours",
    defaults: {
      programFlow: baseFlow(),
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
      people: { communicationsNeeded: true, pressLiaisonNeeded: true },
    },
  },
  {
    id: "press_interview",
    label: "Press interview",
    primaryCalendar: "Press and Media",
    eventType: "Media preparation",
    durationPreset: "45 minutes",
    defaults: {
      preEventActions: checkboxList(PRE_EVENT_ACTIONS.slice(0, 12)),
      people: { communicationsNeeded: true, pressLiaisonNeeded: true },
    },
  },
  {
    id: "social_recording",
    label: "Social media recording",
    primaryCalendar: "Social Media",
    eventType: "Other",
    durationPreset: "1 hour",
    defaults: {
      people: { videographerNeeded: true, photographerNeeded: true },
      packingItems: packingList(["Phone chargers", "Battery packs", "Backdrop"]),
    },
  },
  {
    id: "volunteer_canvass",
    label: "Volunteer canvass launch",
    primaryCalendar: "Volunteer Operations",
    eventType: "Door-knocking launch",
    durationPreset: "2 hours",
    defaults: {
      packingItems: packingList(["Clipboards", "Pens", "Palm cards", "Sign-up sheets"]),
      people: { volunteerLeadNeeded: true },
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
    },
  },
  {
    id: "community_meeting",
    label: "Community meeting",
    primaryCalendar: "Public Events",
    eventType: "Community meeting",
    durationPreset: "90 minutes",
    defaults: {
      programFlow: baseFlow(),
      preEventActions: checkboxList(PRE_EVENT_ACTIONS),
      eventDayActions: checkboxList(EVENT_DAY_ACTIONS),
      postEventActions: checkboxList(POST_EVENT_ACTIONS),
    },
  },
  {
    id: "donor_call_time",
    label: "Donor call time",
    primaryCalendar: "Fundraising",
    eventType: "Call time",
    durationPreset: "1 hour",
    defaults: {
      people: { financeNeeded: true },
      visibility: {
        locationDisclosure: "HIDDEN",
        generalVisibility: "Protected",
        showCalendarName: true,
        showSafeTitle: true,
        showGeneralLocation: false,
        showStartEnd: true,
        hideProtectedDetails: true,
      },
    },
  },
  {
    id: "travel_block",
    label: "Travel block",
    primaryCalendar: "Travel",
    eventType: "Travel block",
    durationPreset: "2 hours",
    defaults: {
      travelPlan: { candidateTravelRequired: true },
      location: {
        state: "Arkansas",
        locationDisclosure: "CITY",
        city: "",
      },
    },
  },
  {
    id: "internal_meeting",
    label: "Internal campaign meeting",
    primaryCalendar: "Internal Meetings",
    eventType: "Meeting",
    durationPreset: "1 hour",
    defaults: {},
  },
  {
    id: "personal_protected",
    label: "Personal protected block",
    primaryCalendar: "Protected Personal Time",
    eventType: "Protected personal block",
    durationPreset: "1 hour",
    defaults: {
      visibility: {
        locationDisclosure: "HIDDEN",
        generalVisibility: "Protected",
        showCalendarName: true,
        showSafeTitle: true,
        showGeneralLocation: false,
        showStartEnd: true,
        hideProtectedDetails: true,
      },
      basic: {
        primaryCalendar: "Protected Personal Time",
        additionalCalendars: [],
        eventType: "Protected personal block",
        internalTitle: "Protected Personal Time",
        campaignDisplayTitle: "Protected Personal Time",
        restrictedDisplayTitle: "Protected Personal Time",
        priority: "Normal",
        confirmationStatus: "Confirmed",
      },
    },
  },
];

export function getPreset(id: string): EventPreset | undefined {
  return EVENT_PRESETS.find((p) => p.id === id);
}
