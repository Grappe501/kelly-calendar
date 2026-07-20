"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  CampaignCommChannel,
  CampaignCommPurpose,
} from "@/lib/missions/v21/communications";
import {
  labelCommChannel,
  labelCommPurpose,
} from "@/lib/missions/v21/communications";
import { commJsonFetch } from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";

const CHANNELS: CampaignCommChannel[] = [
  "EMAIL",
  "SMS",
  "PHONE",
  "IN_APP",
  "MANUAL",
];

const PURPOSES: CampaignCommPurpose[] = [
  "MISSION_STAFFING",
  "EVENT_REMINDER",
  "OPERATIONAL_UPDATE",
  "FOLLOW_UP",
  "MOBILIZE_SIGNUP_LINK",
  "MANUAL_OUTREACH",
  "OTHER",
];

export function CommunicationCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<CampaignCommChannel>("EMAIL");
  const [purpose, setPurpose] = useState<CampaignCommPurpose>(
    "MISSION_STAFFING",
  );
  const [missionId, setMissionId] = useState(
    searchParams.get("missionId") ?? "",
  );
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");

  function submit() {
    startTransition(async () => {
      setError(null);
      try {
        const json = await commJsonFetch<{ detail: { communication: { id: string } } }>(
          "/api/communications",
          "POST",
          {
            title,
            channel,
            purpose,
            missionId: missionId.trim() || undefined,
            subject: subject.trim() || undefined,
            bodyText: bodyText.trim() || undefined,
          },
        );
        router.push(`/system/communications/${json.detail.communication.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Create failed.");
      }
    });
  }

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications</p>
        <h1>New communication draft</h1>
        <nav className="briefing-nav" aria-label="Communications navigation">
          <Link href="/system/communications">All communications</Link>
          <Link href="/system/communications/policy">Policy</Link>
        </nav>
      </header>

      <CommunicationsNotices />

      <section className="panel" aria-labelledby="create-form-h">
        <h2 id="create-form-h">Draft details</h2>
        <div className="form-stack">
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            Channel
            <select
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as CampaignCommChannel)
              }
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {labelCommChannel(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purpose
            <select
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value as CampaignCommPurpose)
              }
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {labelCommPurpose(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mission ID (optional)
            <input
              value={missionId}
              onChange={(e) => setMissionId(e.target.value)}
              placeholder="Link to a mission for staffing sources"
            />
          </label>
          <label>
            Subject (optional)
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>
            Body (optional)
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={6}
            />
          </label>
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={pending || !title.trim()}
            onClick={submit}
          >
            Create draft
          </button>
          <Link className="button secondary" href="/system/communications">
            Cancel
          </Link>
        </div>
      </section>
    </article>
  );
}
