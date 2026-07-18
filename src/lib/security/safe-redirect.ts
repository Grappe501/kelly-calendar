export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  const lower = path.toLowerCase();
  if (lower.startsWith("/javascript:") || lower.startsWith("/data:")) return false;
  return true;
}

export function resolveSafeRedirect(
  candidate: string | null | undefined,
  options?: { approvedOrigins?: string[]; fallback?: string },
): string {
  const fallback = options?.fallback ?? "/";
  if (!candidate) return fallback;

  if (isSafeInternalPath(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    if (url.protocol === "javascript:" || url.protocol === "data:") return fallback;
    const approved = options?.approvedOrigins ?? [];
    if (approved.includes(url.origin)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
