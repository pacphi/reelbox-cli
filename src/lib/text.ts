/** Meta DYI JSON encodes UTF-8 bytes as latin-1 escapes; undo that. */
export function fixMojibake(s: string | undefined): string | undefined {
  if (!s) return s;
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    return fixed.includes("\uFFFD") ? s : fixed;
  } catch {
    return s;
  }
}

export function slugify(s: string, maxLen = 60): string {
  const out = s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .slice(0, maxLen)
    .replace(/^-+|-+$/g, "");
  return out || "untitled";
}

export const HASHTAG_RE = /#(\w[\w\d_]*)/g;

export function extractTags(caption: string | undefined, max = 12): string[] {
  if (!caption) return [];
  const tags = [...caption.matchAll(HASHTAG_RE)].map((m) => m[1].toLowerCase());
  return [...new Set(tags)].slice(0, max);
}
