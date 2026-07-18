import { getPublicAppConfig } from "@/lib/env/public-config";

export type ElectionCountdown = {
  electionDate: string;
  timezone: string;
  daysRemaining: number;
  isElectionDay: boolean;
  isPastElection: boolean;
  label: string;
};

function startOfDayInTimezone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getElectionCountdown(
  now: Date = new Date(),
  electionDate = getPublicAppConfig().electionDate,
  timezone = getPublicAppConfig().campaignTimezone,
): ElectionCountdown {
  const today = startOfDayInTimezone(now, timezone);
  const [y, m, d] = electionDate.split("-").map(Number);
  const election = new Date(Date.UTC(y, m - 1, d));
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((election.getTime() - today.getTime()) / msPerDay);

  if (diffDays > 0) {
    return {
      electionDate,
      timezone,
      daysRemaining: diffDays,
      isElectionDay: false,
      isPastElection: false,
      label: `${diffDays} day${diffDays === 1 ? "" : "s"} until Election Day`,
    };
  }

  if (diffDays === 0) {
    return {
      electionDate,
      timezone,
      daysRemaining: 0,
      isElectionDay: true,
      isPastElection: false,
      label: "Election Day",
    };
  }

  return {
    electionDate,
    timezone,
    daysRemaining: diffDays,
    isElectionDay: false,
    isPastElection: true,
    label: "Election day has passed",
  };
}

export function formatCampaignDate(
  date: Date = new Date(),
  timezone = getPublicAppConfig().campaignTimezone,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
