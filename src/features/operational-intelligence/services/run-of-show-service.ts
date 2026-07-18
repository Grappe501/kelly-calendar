export type CandidateRunOfShow = {
  eventId: string;
  eventNumber: string;
  title: string;
  calendar: string;
  objectiveSummary: string[];
  candidateRole?: string;
  schedule: Array<{
    time: string;
    label: string;
    instruction: string;
    location?: string;
    contact?: string;
  }>;
  travel?: {
    departureAt?: string;
    arrivalTarget?: string;
    durationMinutes?: number;
    driver?: string;
    safeOriginLabel?: string;
    safeDestinationLabel?: string;
  };
  peopleToKnow: Array<{ displayName: string; role: string; pronunciation?: string }>;
  messages: string[];
  risks: string[];
  requiredMaterials: string[];
  followups: string[];
  protectedSectionsOmitted: string[];
};

export function generateCandidateRunOfShow(input: {
  eventId: string;
  eventNumber: string;
  title: string;
  calendarName: string;
  candidateRole?: string | null;
  objectives?: string[];
  programFlow?: Array<{ startsAt?: string; title: string; description?: string }>;
  travel?: CandidateRunOfShow["travel"];
  people?: CandidateRunOfShow["peopleToKnow"];
  messages?: string[];
  packingNames?: string[];
  followups?: string[];
  viewerLimited?: boolean;
}): CandidateRunOfShow {
  const limited = Boolean(input.viewerLimited);
  return {
    eventId: input.eventId,
    eventNumber: input.eventNumber,
    title: input.title,
    calendar: input.calendarName,
    objectiveSummary: input.objectives ?? [],
    candidateRole: input.candidateRole ?? undefined,
    schedule: (input.programFlow ?? []).map((p) => ({
      time: p.startsAt ?? "",
      label: p.title,
      instruction: p.description ?? p.title,
      location: limited ? undefined : undefined,
    })),
    travel: limited
      ? input.travel
        ? {
            departureAt: input.travel.departureAt,
            arrivalTarget: input.travel.arrivalTarget,
            durationMinutes: input.travel.durationMinutes,
            safeOriginLabel: input.travel.safeOriginLabel,
            safeDestinationLabel: input.travel.safeDestinationLabel,
          }
        : undefined
      : input.travel,
    peopleToKnow: limited ? [] : (input.people ?? []),
    messages: input.messages ?? [],
    risks: [],
    requiredMaterials: limited ? [] : (input.packingNames ?? []),
    followups: limited ? [] : (input.followups ?? []),
    protectedSectionsOmitted: limited
      ? ["PARTICIPANTS", "PRIVATE_NOTES", "TRAVEL_DETAILS", "FILES", "SECURITY"]
      : [],
  };
}
