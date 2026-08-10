import { basename } from "node:path";
import type { Reel } from "../types.js";
import { readExportJson } from "./exportReader.js";
import { urlKey, URL_RE } from "../lib/urlKey.js";
import { fixMojibake } from "../lib/text.js";
import { toDate } from "../lib/dates.js";

interface Found {
  url?: string;
  ts?: unknown;
  title?: string;
}

const GENERIC_STEMS = new Set([
  "saved_items",
  "your_saved_items",
  "saved_items_and_collections",
]);

function walk(obj: unknown, found: Found): void {
  if (Array.isArray(obj)) {
    for (const item of obj) walk(item, found);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === "timestamp" && found.ts === undefined) found.ts = v;
      else if ((k === "title" || k === "name") && typeof v === "string" && !found.title)
        found.title = fixMojibake(v);
      else if (typeof v === "string" && URL_RE.test(v) && urlKey(v))
        found.url ||= URL_RE.exec(v)?.[0];
      else walk(v, found);
    }
  }
}

/**
 * Facebook DYI export: saved_items_and_collections/*.json — the schema drifts
 * across export versions, so entries are walked tolerantly for reel URLs.
 */
export function parseFacebookExport(root: string): Reel[] {
  const reels: Reel[] = [];
  for (const { relPath, data } of readExportJson(root, "saved")) {
    const stem = basename(relPath).replace(/\.json$/i, "");
    const collection = GENERIC_STEMS.has(stem)
      ? undefined
      : titleCase(fixMojibake(stem.replace(/_/g, " "))?.trim() ?? "");

    let entries: unknown[] = [];
    if (Array.isArray(data)) entries = data;
    else if (data && typeof data === "object") {
      for (const v of Object.values(data as Record<string, unknown>)) {
        if (Array.isArray(v)) entries.push(...v);
      }
    }

    for (const e of entries) {
      const found: Found = {};
      walk(e, found);
      const key = urlKey(found.url);
      if (!key || !found.url) continue;
      const m = /^(?:You saved\s+)?(.+?)(?:'s (?:reel|video)| saved)/.exec(found.title ?? "");
      reels.push({
        key,
        url: found.url,
        platform: "facebook",
        authorName: m?.[1]?.trim() || undefined,
        saved: toDate(found.ts),
        collection: collection || undefined,
        tags: [],
      });
    }
  }
  return reels;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
