type Props = {
  gaps: string[];
};

export function ResponsibilityGrid({ gaps }: Props) {
  if (!gaps.length) return null;
  return (
    <p className="dev-banner" role="alert">
      Unassigned required roles: {gaps.join("; ")}
    </p>
  );
}
