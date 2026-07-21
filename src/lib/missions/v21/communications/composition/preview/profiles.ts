/** Fabricated preview personas — never real campaign contacts. */
export type PreviewProfile = {
  key: string;
  label: string;
  fabricatedBanner: "FABRICATED TEST DATA";
  context: {
    recipient: Record<string, string>;
    mission: Record<string, string>;
    event: Record<string, string>;
    campaign: Record<string, string>;
    communication: Record<string, string>;
  };
};

export const PREVIEW_PROFILES: PreviewProfile[] = [
  {
    key: "standard_supporter",
    label: "Standard supporter",
    fabricatedBanner: "FABRICATED TEST DATA",
    context: {
      recipient: { first_name: "Alex", full_name: "Alex Rivera" },
      mission: {
        title: "County Listening Session",
        date: "July 21, 2026",
        location: "Tulsa Community Center",
      },
      event: { start_time: "6:00 PM" },
      campaign: {
        candidate_name: "Kelly Grappe",
        reply_email: "hello@example.test",
      },
      communication: { call_to_action: "RSVP today" },
    },
  },
  {
    key: "missing_first_name",
    label: "Missing first name",
    fabricatedBanner: "FABRICATED TEST DATA",
    context: {
      recipient: { first_name: "", full_name: "" },
      mission: {
        title: "County Listening Session",
        date: "July 21, 2026",
        location: "Tulsa Community Center",
      },
      event: { start_time: "6:00 PM" },
      campaign: {
        candidate_name: "Kelly Grappe",
        reply_email: "hello@example.test",
      },
      communication: { call_to_action: "Learn more" },
    },
  },
  {
    key: "unicode_name",
    label: "Unicode name",
    fabricatedBanner: "FABRICATED TEST DATA",
    context: {
      recipient: { first_name: "José", full_name: "José García" },
      mission: {
        title: "Encuentro comunitario",
        date: "July 21, 2026",
        location: "Oklahoma City",
      },
      event: { start_time: "5:30 PM" },
      campaign: {
        candidate_name: "Kelly Grappe",
        reply_email: "hello@example.test",
      },
      communication: { call_to_action: "Únete" },
    },
  },
  {
    key: "sms_segment_stress",
    label: "SMS segment stress test",
    fabricatedBanner: "FABRICATED TEST DATA",
    context: {
      recipient: { first_name: "Sam", full_name: "Sam Lee" },
      mission: {
        title: "Very Long Mission Title For Segment Stress Testing Across Boundaries",
        date: "July 21, 2026",
        location: "Statewide virtual",
      },
      event: { start_time: "12:00 PM" },
      campaign: {
        candidate_name: "Kelly Grappe",
        reply_email: "hello@example.test",
      },
      communication: {
        call_to_action:
          "Please read the full reminder and confirm attendance if you are able to join us.",
      },
    },
  },
  {
    key: "no_location",
    label: "No location",
    fabricatedBanner: "FABRICATED TEST DATA",
    context: {
      recipient: { first_name: "Jordan", full_name: "Jordan Blake" },
      mission: {
        title: "Virtual Town Hall",
        date: "July 22, 2026",
        location: "",
      },
      event: { start_time: "7:00 PM" },
      campaign: {
        candidate_name: "Kelly Grappe",
        reply_email: "hello@example.test",
      },
      communication: { call_to_action: "Join online" },
    },
  },
];

export function getPreviewProfile(key: string): PreviewProfile | undefined {
  return PREVIEW_PROFILES.find((p) => p.key === key);
}
