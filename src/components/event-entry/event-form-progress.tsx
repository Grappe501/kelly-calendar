type Props = {
  step: number;
  total?: number;
};

export function EventFormProgress({ step, total = 8 }: Props) {
  return (
    <p className="muted">
      Planning section {step} of {total}
    </p>
  );
}
