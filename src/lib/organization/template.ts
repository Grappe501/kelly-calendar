/**
 * IC-02C locked organization template — versioned, installable, no people.
 */

export const ORG_TEMPLATE_CODE = "KCCC_CAMPAIGN_OPERATING_STRUCTURE" as const;
export const ORG_TEMPLATE_VERSION = "1.0.0" as const;
export const ORG_CAMPAIGN_SCOPE = "KELLY" as const;
export const ORG_BUILD_ID = "KCCC-IC-02C-CAMPAIGN-OPERATING-STRUCTURE-1.0" as const;

export type OrgDepartmentDef = {
  key: string;
  displayName: string;
  purpose: string;
  parentKey?: string;
  sortOrder: number;
  privacyLevel: "INTERNAL" | "LEADERSHIP" | "FINANCE_RESTRICTED" | "CONFIDENTIAL";
  functions: Array<{ key: string; displayName: string; purpose: string; sortOrder: number }>;
};

export type OrgPositionDef = {
  key: string;
  title: string;
  departmentKey?: string;
  functionKey?: string;
  reportsToPositionKey?: string;
  scopeType: "STATEWIDE" | "CLUSTER" | "COUNTY";
  permissionsProfile: string;
  privacyLevel?: "INTERNAL" | "LEADERSHIP" | "FINANCE_RESTRICTED" | "CONFIDENTIAL";
  sortOrder: number;
};

/** Four top-level operating departments + candidate/campaign management lanes. */
export const ORG_DEPARTMENTS: OrgDepartmentDef[] = [
  {
    key: "CANDIDATE",
    displayName: "Candidate",
    purpose: "Public leadership, statewide relationships, message, candidate activity.",
    sortOrder: 10,
    privacyLevel: "LEADERSHIP",
    functions: [
      {
        key: "CANDIDATE_LEADERSHIP",
        displayName: "Candidate Leadership",
        purpose: "Vision, relationships, strategic decisions.",
        sortOrder: 10,
      },
    ],
  },
  {
    key: "CAMPAIGN_MANAGEMENT",
    displayName: "Campaign Management",
    purpose: "Priorities, manager accountability, schedule approval, escalations.",
    sortOrder: 20,
    privacyLevel: "LEADERSHIP",
    functions: [
      {
        key: "CAMPAIGN_MANAGER_OFFICE",
        displayName: "Campaign Manager Office",
        purpose: "Cross-department coordination and sensitive decisions.",
        sortOrder: 10,
      },
    ],
  },
  {
    key: "VOLUNTEER_AND_ORGANIZING",
    displayName: "Volunteer and Organizing",
    purpose: "Intake, training, placement, county organizing, voter engagement, youth, distributed actions.",
    sortOrder: 30,
    privacyLevel: "INTERNAL",
    functions: [
      { key: "VOLUNTEER_INTAKE_TRAINING_PLACEMENT", displayName: "Volunteer Intake, Training and Placement", purpose: "Onboarding, skills, retention, next action.", sortOrder: 10 },
      { key: "COUNTY_ORGANIZING", displayName: "County Organizing", purpose: "Clusters, captains, local leadership.", sortOrder: 20 },
      { key: "VOTER_ENGAGEMENT", displayName: "Voter Engagement", purpose: "Registration, civic education, contact, GOTV.", sortOrder: 30 },
      { key: "COLLEGE_AND_YOUTH", displayName: "College and Youth", purpose: "Campus leads and youth pathways into counties.", sortOrder: 40 },
      { key: "EVENTS_AND_DISTRIBUTED_ACTIONS", displayName: "Events and Distributed Actions", purpose: "Volunteer execution of events and actions.", sortOrder: 50 },
    ],
  },
  {
    key: "COMMUNICATIONS",
    displayName: "Communications",
    purpose: "Content, creative, phone/text policy, press and paid media.",
    sortOrder: 40,
    privacyLevel: "INTERNAL",
    functions: [
      { key: "EMAIL_AND_CONTENT", displayName: "Email and Content", purpose: "Email and written content.", sortOrder: 10 },
      { key: "SOCIAL_DIGITAL_CREATIVE", displayName: "Social, Digital and Creative", purpose: "Social, digital, graphics, photo/video.", sortOrder: 20 },
      { key: "PHONE_AND_TEXT", displayName: "Phone and Text", purpose: "Message/audience policy; shared volunteer staffing.", sortOrder: 30 },
      { key: "PRESS_EARNED_PAID", displayName: "Press, Earned and Paid Media", purpose: "Press, APA, radio, newspaper, advertising.", sortOrder: 40 },
    ],
  },
  {
    key: "FINANCE",
    displayName: "Finance",
    purpose: "Compliance, budget, fundraising operations.",
    sortOrder: 50,
    privacyLevel: "FINANCE_RESTRICTED",
    functions: [
      { key: "TREASURER_COMPLIANCE", displayName: "Treasurer and Compliance", purpose: "Legal/compliance deadlines.", sortOrder: 10 },
      { key: "BUDGET_BOOKKEEPING", displayName: "Budget and Bookkeeping", purpose: "Budget requests and bookkeeping.", sortOrder: 20 },
      { key: "FUNDRAISING_OPERATIONS", displayName: "Fundraising Operations", purpose: "Targets, call time, host committees, pledges.", sortOrder: 30 },
    ],
  },
  {
    key: "OPERATIONS_AND_DATA",
    displayName: "Operations and Data",
    purpose: "Calendar, activation routing, logistics, systems, reporting — connective tissue.",
    sortOrder: 60,
    privacyLevel: "INTERNAL",
    functions: [
      { key: "MASTER_CALENDAR_SCHEDULING", displayName: "Master Calendar and Candidate Scheduling", purpose: "Canonical calendar and scheduling.", sortOrder: 10 },
      { key: "MISSION_ACTIVATION_ROUTING", displayName: "Mission Activation and Task Routing", purpose: "Playbook application and routing (IC-02B).", sortOrder: 20 },
      { key: "TRAVEL_LODGING_ADVANCE", displayName: "Travel, Lodging and Advance", purpose: "Travel and advance coordination.", sortOrder: 30 },
      { key: "MATERIALS_LOGISTICS", displayName: "Materials and Logistics", purpose: "Materials movement and logistics board.", sortOrder: 40 },
      { key: "DATA_SYSTEMS_REPORTING", displayName: "Data, Systems and Reporting", purpose: "Permissions, data quality, reporting.", sortOrder: 50 },
    ],
  },
];

/** Core statewide positions (county captains generated from IC-01 at install). */
export const ORG_CORE_POSITIONS: OrgPositionDef[] = [
  { key: "CANDIDATE", title: "Candidate — Kelly Grappe", departmentKey: "CANDIDATE", functionKey: "CANDIDATE_LEADERSHIP", scopeType: "STATEWIDE", permissionsProfile: "CANDIDATE", privacyLevel: "LEADERSHIP", sortOrder: 10 },
  { key: "CAMPAIGN_MANAGER", title: "Campaign Manager", departmentKey: "CAMPAIGN_MANAGEMENT", functionKey: "CAMPAIGN_MANAGER_OFFICE", reportsToPositionKey: "CANDIDATE", scopeType: "STATEWIDE", permissionsProfile: "CAMPAIGN_MANAGER", privacyLevel: "LEADERSHIP", sortOrder: 20 },
  { key: "VOLUNTEER_ORGANIZING_MANAGER", title: "Volunteer and Organizing Manager", departmentKey: "VOLUNTEER_AND_ORGANIZING", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "DEPARTMENT_MANAGER", sortOrder: 30 },
  { key: "VOLUNTEER_INTAKE_PLACEMENT_COORD", title: "Volunteer Intake and Placement Coordinator", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "VOLUNTEER_INTAKE_TRAINING_PLACEMENT", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 31 },
  { key: "VOLUNTEER_TRAINING_COORD", title: "Volunteer Training Coordinator", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "VOLUNTEER_INTAKE_TRAINING_PLACEMENT", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 32 },
  { key: "COUNTY_ORGANIZING_LEAD", title: "County Organizing Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "COUNTY_ORGANIZING", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 33 },
  { key: "VOTER_ENGAGEMENT_LEAD", title: "Voter Engagement Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "VOTER_ENGAGEMENT", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 34 },
  { key: "COLLEGE_YOUTH_LEAD", title: "College and Youth Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "COLLEGE_AND_YOUTH", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 35 },
  { key: "EVENTS_DISTRIBUTED_ACTIONS_LEAD", title: "Events and Distributed Actions Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "EVENTS_AND_DISTRIBUTED_ACTIONS", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 36 },
  { key: "COMMUNICATIONS_MANAGER", title: "Communications Manager", departmentKey: "COMMUNICATIONS", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "DEPARTMENT_MANAGER", sortOrder: 40 },
  { key: "EMAIL_CONTENT_LEAD", title: "Email and Content Lead", departmentKey: "COMMUNICATIONS", functionKey: "EMAIL_AND_CONTENT", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 41 },
  { key: "SOCIAL_DIGITAL_CREATIVE_LEAD", title: "Social, Digital and Creative Lead", departmentKey: "COMMUNICATIONS", functionKey: "SOCIAL_DIGITAL_CREATIVE", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 42 },
  { key: "PHONE_TEXT_LEAD", title: "Phone and Text Program Lead", departmentKey: "COMMUNICATIONS", functionKey: "PHONE_AND_TEXT", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 43 },
  { key: "PRESS_PAID_MEDIA_LEAD", title: "Press, Earned and Paid Media Lead", departmentKey: "COMMUNICATIONS", functionKey: "PRESS_EARNED_PAID", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 44 },
  { key: "FINANCE_MANAGER", title: "Finance Manager", departmentKey: "FINANCE", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_MANAGER", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 50 },
  { key: "TREASURER_COMPLIANCE_LEAD", title: "Treasurer/Compliance Lead", departmentKey: "FINANCE", functionKey: "TREASURER_COMPLIANCE", reportsToPositionKey: "FINANCE_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_COORDINATOR", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 51 },
  { key: "BUDGET_BOOKKEEPING_LEAD", title: "Budget and Bookkeeping Lead", departmentKey: "FINANCE", functionKey: "BUDGET_BOOKKEEPING", reportsToPositionKey: "FINANCE_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_COORDINATOR", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 52 },
  { key: "FUNDRAISING_OPS_LEAD", title: "Fundraising Operations Lead", departmentKey: "FINANCE", functionKey: "FUNDRAISING_OPERATIONS", reportsToPositionKey: "FINANCE_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_COORDINATOR", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 53 },
  { key: "OPERATIONS_DATA_COORDINATOR", title: "Operations and Data Coordinator", departmentKey: "OPERATIONS_AND_DATA", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "DEPARTMENT_MANAGER", sortOrder: 60 },
  { key: "SCHEDULING_ADVANCE_COORD", title: "Scheduling and Advance Coordinator", departmentKey: "OPERATIONS_AND_DATA", functionKey: "MASTER_CALENDAR_SCHEDULING", reportsToPositionKey: "OPERATIONS_DATA_COORDINATOR", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 61 },
  { key: "LOGISTICS_COORD", title: "Logistics Coordinator", departmentKey: "OPERATIONS_AND_DATA", functionKey: "MATERIALS_LOGISTICS", reportsToPositionKey: "OPERATIONS_DATA_COORDINATOR", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 62 },
  { key: "DATA_SYSTEMS_COORD", title: "Data and Systems Coordinator", departmentKey: "OPERATIONS_AND_DATA", functionKey: "DATA_SYSTEMS_REPORTING", reportsToPositionKey: "OPERATIONS_DATA_COORDINATOR", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 63 },
];

export const ORG_CLUSTER_KEYS = [
  { key: "CLUSTER_1", displayName: "Cluster 1", sortOrder: 1 },
  { key: "CLUSTER_2", displayName: "Cluster 2", sortOrder: 2 },
  { key: "CLUSTER_3", displayName: "Cluster 3", sortOrder: 3 },
  { key: "CLUSTER_4", displayName: "Cluster 4", sortOrder: 4 },
  { key: "CLUSTER_5", displayName: "Cluster 5", sortOrder: 5 },
  { key: "CLUSTER_6", displayName: "Cluster 6", sortOrder: 6 },
] as const;

/** Top-level operating departments (excludes Candidate / Campaign Management lanes). */
export const TOP_OPERATING_DEPARTMENT_KEYS = [
  "VOLUNTEER_AND_ORGANIZING",
  "COMMUNICATIONS",
  "FINANCE",
  "OPERATIONS_AND_DATA",
] as const;

export function buildOrgTemplateFingerprint(): string {
  return `${ORG_TEMPLATE_CODE}@${ORG_TEMPLATE_VERSION}|depts:${ORG_DEPARTMENTS.length}|positions:${ORG_CORE_POSITIONS.length}|clusters:6|captains:75`;
}
