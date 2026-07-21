/** Server-side HTML sanitizer for composition renders — strip scripts/exec attrs. */
export function sanitizeCompositionHtml(raw: string): string {
  let html = raw;
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<\/?iframe\b[^>]*>/gi, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript:/gi, "");
  html = html.replace(/data:text\/html/gi, "");
  return html;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function assertNoUnresolvedTokens(value: string): string[] {
  const found: string[] = [];
  for (const m of value.matchAll(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi)) {
    found.push(m[1]!.toLowerCase());
  }
  return found;
}
