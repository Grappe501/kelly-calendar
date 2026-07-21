import { createHash } from "node:crypto";
import type { LiveTestRevisionSnapshot } from "@/lib/missions/v21/communications/live-tests/live-test-types";
import {
  AUTHORIZE_PHRASE,
  LAUNCH_PHRASE,
} from "@/lib/missions/v21/communications/live-tests/live-test-types";

export function liveTestRevisionHash(snap: LiveTestRevisionSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snap)).digest("hex");
}

export function readinessEvidenceHash(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function liveTestAuthorizationHash(input: {
  programRevisionId: string;
  readinessHash: string;
  providerKey: string;
  senderProfileKey: string | null;
  renderArtifactId: string;
  recipientId: string;
  destinationFingerprint: string;
  channel: string;
  maximumRecipients: number;
  maximumAttempts: number;
  maximumProviderRequests: number;
  manualLaunchOnly: boolean;
  retriesAllowed: boolean;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function phraseHash(phrase: string): string {
  return createHash("sha256")
    .update(phrase.trim().toUpperCase())
    .digest("hex");
}

export function matchesAuthorizePhrase(input: string): boolean {
  return phraseHash(input) === phraseHash(AUTHORIZE_PHRASE);
}

export function matchesLaunchPhrase(input: string): boolean {
  return phraseHash(input) === phraseHash(LAUNCH_PHRASE);
}

export function postTestSafetyEvidenceHash(
  snapshot: Record<string, unknown>,
): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function liveTestEvidenceHash(
  snapshot: Record<string, unknown>,
): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function destinationFingerprintFromMasked(
  channel: string,
  masked: string,
  salt: string,
): string {
  return createHash("sha256")
    .update(`${channel}|${masked}|${salt}`)
    .digest("hex");
}
