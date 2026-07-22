/**
 * CC-07 Unified Search — deterministic text normalization and ranking.
 * No fuzzy matching / no Levenshtein — operators must be able to explain
 * exactly why a result matched.
 */

const PUNCTUATION_RE = /[.,;:!?'"()[\]{}<>/\\|@#$%^&*_+=~`\-]+/g;
const WHITESPACE_RE = /\s+/g;
const DIACRITIC_RE = /[\u0300-\u036f]/g;

/**
 * Lowercase, strip diacritics, collapse ordinary punctuation to spaces,
 * collapse whitespace, and trim. Safe to call repeatedly (idempotent).
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKD")
    .replace(DIACRITIC_RE, "")
    .toLowerCase()
    .replace(PUNCTUATION_RE, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

/**
 * Deterministic match rank between a search term (`needle`) and a candidate
 * field value (`haystack`). Higher is a stronger match; 0 means no match.
 * Ordering: exact whole-string match > exact word match > prefix match
 * (whole string or any word) > substring match anywhere.
 */
export function rankMatch(needle: string, haystack: string): number {
  const n = normalizeSearchText(needle);
  const h = normalizeSearchText(haystack);
  if (!n || !h) return 0;

  if (h === n) return 100;

  const words = h.split(" ");
  if (words.includes(n)) return 85;

  if (h.startsWith(n)) return 70;
  if (words.some((w) => w.startsWith(n))) return 55;

  if (h.includes(n)) return 30;

  return 0;
}

/** Best rank across several candidate haystacks for the same needle. */
export function rankMatchAny(needle: string, haystacks: readonly string[]): number {
  let best = 0;
  for (const h of haystacks) {
    const rank = rankMatch(needle, h);
    if (rank > best) best = rank;
  }
  return best;
}

/**
 * Split a free-text query into normalized terms (space-delimited after
 * normalization). Each term must match somewhere for `matchesAllTerms`.
 */
export function tokenizeSearchQuery(query: string | null | undefined): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

/** Extract a short, human-readable snippet around the first match of `needle` in `haystack`. */
export function extractSnippet(
  needle: string,
  haystack: string | null | undefined,
  radius = 40,
): string | undefined {
  if (!haystack) return undefined;
  const n = normalizeSearchText(needle);
  const h = normalizeSearchText(haystack);
  if (!n || !h) return undefined;
  const idx = h.indexOf(n);
  if (idx < 0) return undefined;
  const start = Math.max(0, idx - radius);
  const end = Math.min(haystack.length, idx + n.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < haystack.length ? "…" : "";
  return `${prefix}${haystack.slice(start, end).trim()}${suffix}`;
}
