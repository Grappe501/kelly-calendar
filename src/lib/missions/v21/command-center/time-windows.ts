import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import type { MissionCommandCenterConfig } from "@/lib/missions/v21/command-center/config";

export function addCampaignDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60_000;
}

export function isDueBeforeCampaignDay(
  dueAt: string,
  now: Date,
  timeZone: string,
): boolean {
  return campaignDateKey(new Date(dueAt), timeZone) < campaignDateKey(now, timeZone);
}

export function isDueOnCampaignDay(
  dueAt: string,
  now: Date,
  timeZone: string,
): boolean {
  return campaignDateKey(new Date(dueAt), timeZone) === campaignDateKey(now, timeZone);
}

export function isWithinUpcomingWindow(
  startsAt: string,
  now: Date,
  timeZone: string,
  config: MissionCommandCenterConfig,
): boolean {
  const startKey = campaignDateKey(startsAt, timeZone);
  const today = campaignDateKey(now, timeZone);
  const endKey = addCampaignDays(today, config.upcomingWindowDays);
  return startKey >= today && startKey <= endKey;
}

export function isWithinRecentlyClosedWindow(
  closedAt: string,
  now: Date,
  timeZone: string,
  config: MissionCommandCenterConfig,
): boolean {
  const closedKey = campaignDateKey(closedAt, timeZone);
  const today = campaignDateKey(now, timeZone);
  const earliest = addCampaignDays(today, -config.recentlyClosedWindowDays);
  return closedKey >= earliest && closedKey <= today;
}

export function startsWithinPrepareRiskWindow(
  startsAt: string,
  now: Date,
  config: MissionCommandCenterConfig,
): boolean {
  const start = new Date(startsAt);
  const hours = hoursBetween(now, start);
  return hours >= 0 && hours <= config.prepareRiskWindowHours;
}

export function formatRelativeAge(
  fromIso: string | null,
  now: Date,
): string | null {
  if (!fromIso) return null;
  const hours = Math.max(0, Math.floor(hoursBetween(new Date(fromIso), now)));
  if (hours < 1) return "less than 1 hour";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
