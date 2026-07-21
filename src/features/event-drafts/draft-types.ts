export type DraftStatus =
  | "QUICK_DRAFT"
  | "PLANNING"
  | "READY_FOR_REVIEW"
  | "APPROVED_FOR_FUTURE_SAVE";

export type ChecklistItemState =
  | "NOT_NEEDED"
  | "NEEDED"
  | "ASSIGNED"
  | "PACKED"
  | "LOADED"
  | "DELIVERED"
  | "RETURNED"
  | "MISSING"
  | "DONE"
  | "PENDING";

export type StagedEventDraft = {
  draftId: string;
  draftVersion: number;
  createdAt: string;
  updatedAt: string;
  status: DraftStatus;
  basic: {
    primaryCalendar: string;
    additionalCalendars: string[];
    eventType: string;
    internalTitle: string;
    campaignDisplayTitle: string;
    restrictedDisplayTitle?: string;
    publicTitle?: string;
    priority: string;
    confirmationStatus: string;
  };
  timing: {
    date?: string;
    startTime?: string;
    endTime?: string;
    allDay?: boolean;
    multiDay?: boolean;
    timezone: string;
    durationPreset?: string;
    arrivalTime?: string;
    departureTime?: string;
    travelTimeRequired?: boolean;
    recurring?: boolean;
  };
  location: {
    venue?: string;
    streetAddress?: string;
    city?: string;
    county?: string;
    state: string;
    zip?: string;
    region?: string;
    indoorOutdoor?: string;
    virtual?: boolean;
    locationNotConfirmed?: boolean;
    locationDisclosure: string;
    mapLink?: string;
    virtualLink?: string;
  };
  people: {
    host?: string;
    organization?: string;
    primaryContact?: string;
    contactPhone?: string;
    contactEmail?: string;
    expectedAttendees?: string;
    kellyAttending?: boolean;
    steveAttending?: boolean;
    campaignManagerAttending?: boolean;
    schedulerAttending?: boolean;
    communicationsNeeded?: boolean;
    photographerNeeded?: boolean;
    videographerNeeded?: boolean;
    volunteerLeadNeeded?: boolean;
    driverNeeded?: boolean;
    advanceNeeded?: boolean;
    pressLiaisonNeeded?: boolean;
    financeNeeded?: boolean;
    complianceNeeded?: boolean;
  };
  objectives: {
    primaryObjective?: string;
    secondaryObjective?: string;
    definitionOfSuccess?: string;
    desiredOutcome?: string;
    keyAudience?: string;
    campaignPriority?: string;
  };
  programFlow: Array<{
    id: string;
    sequence: number;
    time?: string;
    duration?: string;
    activity: string;
    personResponsible?: string;
    location?: string;
    requiredMaterial?: string;
    candidateAction?: string;
    completionStatus: string;
  }>;
  packingItems: Array<{
    id: string;
    label: string;
    quantity?: number;
    owner?: string;
    state: ChecklistItemState;
    notes?: string;
  }>;
  staffing: Array<{
    id: string;
    role: string;
    assignedPerson?: string;
    dueDate?: string;
    status: string;
    notes?: string;
    escalationNeeded?: boolean;
  }>;
  preEventActions: Array<{ id: string; label: string; checked: boolean }>;
  eventDayActions: Array<{ id: string; label: string; checked: boolean }>;
  postEventActions: Array<{ id: string; label: string; checked: boolean }>;
  communicationsPlan: Array<{
    id: string;
    channel: string;
    audience?: string;
    owner?: string;
    draftDue?: string;
    approvalDue?: string;
    publishTime?: string;
    status: string;
    messageObjective?: string;
  }>;
  travelPlan: {
    candidateTravelRequired?: boolean;
    staffTravelRequired?: boolean;
    overnightStay?: boolean;
    rentalVehicle?: boolean;
    mileageReimbursement?: boolean;
    departureOrigin?: string;
    destination?: string;
    departureTime?: string;
    arrivalTarget?: string;
    estimatedDriveTime?: string;
    driver?: string;
    vehicle?: string;
    lodging?: string;
  };
  visibility: {
    campaignDisplayTitle?: string;
    restrictedDisplayTitle?: string;
    publicTitle?: string;
    locationDisclosure: string;
    generalVisibility: string;
    showCalendarName: boolean;
    showSafeTitle: boolean;
    showGeneralLocation: boolean;
    showStartEnd: boolean;
    hideProtectedDetails: boolean;
  };
  aiSuggestionsApplied: Array<{ suggestionId: string; appliedAt: string }>;
  databaseWriteAttempted: boolean;
  liveCalendar: false;
};
