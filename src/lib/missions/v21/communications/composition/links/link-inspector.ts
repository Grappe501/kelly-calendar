import type { LinkManifestEntry } from "@/lib/missions/v21/communications/composition/rendering/render-types";

const UNSAFE_SCHEMES = new Set([
  "javascript",
  "data",
  "vbscript",
  "file",
]);

export function extractLinks(content: string): LinkManifestEntry[] {
  const entries: LinkManifestEntry[] = [];
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  const bareRe = /https?:\/\/[^\s<>"']+/gi;

  for (const m of content.matchAll(hrefRe)) {
    entries.push(inspectLink(m[1]!, ""));
  }
  for (const m of content.matchAll(bareRe)) {
    if (!entries.some((e) => e.href === m[0])) {
      entries.push(inspectLink(m[0]!, m[0]!));
    }
  }
  return entries;
}

export function inspectLink(href: string, anchorText: string): LinkManifestEntry {
  const warnings: string[] = [];
  let scheme = "";
  let safe = true;
  try {
    const u = new URL(href, "https://example.invalid");
    scheme = (u.protocol || "").replace(":", "").toLowerCase();
    if (UNSAFE_SCHEMES.has(scheme)) {
      safe = false;
      warnings.push("UNSAFE_SCHEME");
    }
    if (scheme === "http") warnings.push("MISSING_HTTPS");
    if (
      u.hostname === "localhost" ||
      u.hostname.endsWith(".local") ||
      u.hostname === "127.0.0.1"
    ) {
      warnings.push("DEVELOPMENT_LINK");
    }
    const external = !u.hostname.endsWith("example.invalid");
    return {
      href,
      anchorText: anchorText || href,
      scheme,
      external,
      safe,
      warnings,
    };
  } catch {
    return {
      href,
      anchorText: anchorText || href,
      scheme: "invalid",
      external: true,
      safe: false,
      warnings: ["MALFORMED_URL"],
    };
  }
}
