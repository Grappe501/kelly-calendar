"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  labelCommChannel,
  labelCommPurpose,
  labelCommStatus,
} from "@/lib/missions/v21/communications/labels";
import type { CommunicationDetail } from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";

type Props = {
  detail: CommunicationDetail;
  active: "overview" | "audience" | "content" | "queue" | "audit";
  children: ReactNode;
};

export function CommunicationDetailShell({ detail, active, children }: Props) {
  const { communication: comm } = detail;
  const base = `/system/communications/${comm.id}`;

  const tabs = [
    ["overview", "Overview", base],
    ["audience", "Audience", `${base}/audience`],
    ["content", "Content", `${base}/content`],
    ["queue", "Queue", `${base}/queue`],
    ["audit", "Audit", `${base}/audit`],
  ] as const;

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications</p>
        <h1>{comm.title}</h1>
        <p className="muted">
          {labelCommStatus(comm.status)}
          {comm.isStale ? " · Stale" : ""}
          {" · "}
          {labelCommChannel(comm.channel)}
          {" · "}
          {labelCommPurpose(comm.purpose)}
        </p>
        {comm.mission ? (
          <p className="muted">
            Linked mission:{" "}
            <Link href={`/system/missions/${comm.mission.id}`}>
              {comm.mission.title}
            </Link>
          </p>
        ) : null}
        <nav className="briefing-nav" aria-label="Communication navigation">
          <Link href="/system/communications">All communications</Link>
          <Link href="/system/communications/suppressions">Suppressions</Link>
          <Link href="/system/communications/policy">Policy</Link>
          <Link href="/system/communications/providers">Providers</Link>
          <Link href="/system/communications/dispatch">Dispatch</Link>
          {tabs.map(([key, label, href]) => (
            <Link
              key={key}
              href={href}
              aria-current={active === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <CommunicationsNotices notices={detail.notices} />

      {children}
    </article>
  );
}
