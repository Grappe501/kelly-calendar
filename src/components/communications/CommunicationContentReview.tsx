"use client";

import { useState, useTransition } from "react";
import {
  commJsonFetch,
  type CommunicationDetail,
} from "@/components/communications/shared";
import { CommunicationDetailShell } from "@/components/communications/CommunicationDetailShell";

type Props = { initial: CommunicationDetail };

export function CommunicationContentReview({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(initial.communication.subject ?? "");
  const [bodyText, setBodyText] = useState(
    initial.communication.bodyText ?? "",
  );
  const [mobilizeEventUrl, setMobilizeEventUrl] = useState(
    initial.communication.mobilizeEventUrl ?? "",
  );

  const base = `/api/communications/${detail.communication.id}/content`;

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed.");
      }
    });
  }

  return (
    <CommunicationDetailShell detail={detail} active="content">
      {message ? (
        <p className="panel" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error panel" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="content-edit-h">
        <h2 id="content-edit-h">Content review</h2>
        <div className="form-stack">
          <label>
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>
            Body
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={8}
            />
          </label>
          <label>
            Mobilize event URL (optional)
            <input
              value={mobilizeEventUrl}
              onChange={(e) => setMobilizeEventUrl(e.target.value)}
            />
          </label>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const json = await commJsonFetch<{ detail: CommunicationDetail }>(
                  base,
                  "PATCH",
                  { subject, bodyText, mobilizeEventUrl: mobilizeEventUrl || null },
                );
                setDetail(json.detail);
                setSubject(json.detail.communication.subject ?? "");
                setBodyText(json.detail.communication.bodyText ?? "");
                setMessage("Content saved.");
              })
            }
          >
            Save content
          </button>
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const json = await commJsonFetch<{ detail: CommunicationDetail }>(
                  base,
                  "POST",
                );
                setDetail(json.detail);
                setMessage("Content approved.");
              })
            }
          >
            Approve content
          </button>
        </div>
      </section>

      <section className="panel" aria-labelledby="content-preview-h">
        <h2 id="content-preview-h">Preview</h2>
        {detail.contentPreview.subject ? (
          <p>
            <strong>Subject:</strong> {detail.contentPreview.subject}
          </p>
        ) : null}
        <pre className="comm-preview">{detail.contentPreview.bodySafe}</pre>
        {detail.contentPreview.smsEstimate ? (
          <p className="muted">
            SMS estimate: {detail.contentPreview.smsEstimate.length} chars ·{" "}
            {detail.contentPreview.smsEstimate.segments} segment(s)
          </p>
        ) : null}
      </section>
    </CommunicationDetailShell>
  );
}
