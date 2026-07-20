const words = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export const labelCommChannel = (v: string) => words(v);
export const labelCommPurpose = (v: string) => words(v);
export const labelCommStatus = (v: string) => words(v);
export const labelEligibilityState = (v: string) => words(v);
export const labelQueueStatus = (v: string) => words(v);
export const labelInclusionState = (v: string) => words(v);
