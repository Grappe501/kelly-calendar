export const PRE_EVENT_ACTIONS = [
  "Confirm invitation",
  "Confirm date and time",
  "Confirm venue",
  "Confirm address",
  "Confirm host",
  "Confirm contact number",
  "Confirm expected attendance",
  "Confirm candidate role",
  "Confirm speaking time",
  "Confirm introduction",
  "Confirm media presence",
  "Confirm photography policy",
  "Confirm contribution rules",
  "Confirm parking",
  "Confirm arrival entrance",
  "Confirm accessibility",
  "Confirm restroom access",
  "Confirm weather plan",
  "Confirm security concerns",
  "Confirm travel plan",
  "Confirm driver",
  "Confirm lodging",
  "Confirm materials",
  "Confirm staff assignments",
  "Prepare briefing",
  "Prepare talking points",
  "Prepare speech",
  "Prepare social content",
  "Schedule promotion",
  "Send reminders",
  "Final candidate confirmation",
] as const;

export const EVENT_DAY_ACTIONS = [
  "Materials loaded",
  "Candidate departed",
  "Host notified",
  "Staff onsite",
  "Table set up",
  "Signs placed",
  "Volunteer check-in ready",
  "Photographer ready",
  "Video ready",
  "Candidate arrival confirmed",
  "Briefing completed",
  "Photos captured",
  "Contact information collected",
  "Media requests logged",
  "Commitments recorded",
  "Materials recovered",
  "Departure confirmed",
  "Next destination notified",
] as const;

export const POST_EVENT_ACTIONS = [
  "Thank host",
  "Thank volunteers",
  "Add contacts to CRM",
  "Log attendance",
  "Upload photos",
  "Upload video",
  "Publish recap",
  "Send press follow-up",
  "Complete donor follow-up",
  "Complete volunteer follow-up",
  "Record commitments",
  "Assign promised actions",
  "Record mileage",
  "Record expenses",
  "Reconcile materials",
  "Review outcomes",
  "Capture lessons learned",
  "Schedule next contact",
  "Mark event complete",
] as const;

export const STANDARD_PACKING = [
  "Campaign signs",
  "Yard signs",
  "Palm cards",
  "Business cards",
  "Name tags",
  "Tablecloth",
  "Banner",
  "Sign-up sheets",
  "Volunteer forms",
  "Contribution forms",
  "Clipboards",
  "Pens",
  "Phone chargers",
  "Battery packs",
  "Water",
  "Umbrella",
] as const;

export const PROGRAM_FLOW_PRESETS = [
  "Arrival",
  "Host greeting",
  "Private briefing",
  "Meet leadership",
  "Photo line",
  "Candidate remarks",
  "Questions and answers",
  "Media availability",
  "Volunteer greeting",
  "Departure",
  "Travel transition",
  "Follow-up assignment",
] as const;

export const EVENT_OBJECTIVES = [
  "Build relationships",
  "Earn media",
  "Recruit volunteers",
  "Raise money",
  "Meet voters",
  "Reach a target audience",
  "Support local organization",
  "Deliver campaign message",
  "Gather community information",
  "Prepare candidate",
  "Fulfill compliance requirement",
  "Create content",
  "Internal coordination",
  "Other",
] as const;

export function checkboxList(labels: readonly string[]) {
  return labels.map((label, index) => ({
    id: `chk_${index}_${label.toLowerCase().replace(/\s+/g, "_").slice(0, 24)}`,
    label,
    checked: false,
  }));
}

export function packingList(labels: readonly string[]): Array<{
  id: string;
  label: string;
  quantity: number;
  state: "NEEDED" | "NOT_NEEDED";
}> {
  return labels.map((label, index) => ({
    id: `pack_${index}`,
    label,
    quantity: 1,
    state: "NEEDED" as const,
  }));
}
