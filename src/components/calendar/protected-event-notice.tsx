type Props = {
  message?: string;
};

export function ProtectedEventNotice({
  message = "Limited access — protected details are not available for this event.",
}: Props) {
  return (
    <p className="protected-event-notice" role="note">
      {message}
    </p>
  );
}
