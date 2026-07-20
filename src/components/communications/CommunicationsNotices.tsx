import { COMMUNICATION_NOTICES } from "@/components/communications/shared";

type Props = {
  notices?: string[];
};

export function CommunicationsNotices({ notices }: Props) {
  const items = notices?.length ? notices : [...COMMUNICATION_NOTICES];
  return (
    <section className="panel dev-banner" role="note" aria-label="Communications notices">
      {items.map((notice) => (
        <p key={notice}>{notice}</p>
      ))}
    </section>
  );
}
