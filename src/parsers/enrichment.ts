import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { EnrichmentRecord } from "../types.js";
import { urlKey } from "../lib/urlKey.js";
import { toDate } from "../lib/dates.js";

const URL_FIELDS = ["url", "link", "reelUrl", "postUrl", "inputUrl", "webpage_url", "original_url", "shareUrl"];
const CAPTION_FIELDS = ["caption", "text", "description", "caption_text", "title", "message"];
const AUTHOR_FIELDS = ["ownerUsername", "username", "uploader_id", "uploader", "author", "user", "channel"];
const AUTHOR_NAME_FIELDS = ["ownerFullName", "fullName", "pageName", "name", "uploader", "owner"];
const DATE_FIELDS = ["publish_time", "publishTime", "date", "upload_date", "timestamp", "creation_time", "taken_at", "postedAt"];

type Rec = Record<string, unknown>;

function first(d: Rec, keys: string[]): unknown {
  for (const k of keys) {
    let v = d[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = v as Rec;
      v = inner.username ?? inner.name;
    }
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/**
 * Load enrichment JSON — Apify dataset exports and/or yt-dlp .info.json files.
 * Field names are auto-detected across common formats.
 * Returns a map of urlKey → enrichment record.
 */
export function loadEnrichment(paths: string[]): Map<string, EnrichmentRecord> {
  const out = new Map<string, EnrichmentRecord>();

  const files: string[] = [];
  const collect = (p: string): void => {
    const s = statSync(p);
    if (s.isDirectory()) {
      for (const name of readdirSync(p)) collect(join(p, name));
    } else if (p.toLowerCase().endsWith(".json")) {
      files.push(p);
    }
  };
  for (const p of paths) collect(p);

  for (const f of files) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      console.error(`  ! could not parse enrichment file: ${f}`);
      continue;
    }
    const records = Array.isArray(data) ? data : [data];
    for (const rec of records) {
      if (!rec || typeof rec !== "object") continue;
      const r = rec as Rec;
      const key = urlKey(String(first(r, URL_FIELDS) ?? ""));
      if (!key) continue;
      const author = first(r, AUTHOR_FIELDS);
      out.set(key, {
        caption: asString(first(r, CAPTION_FIELDS)),
        author: author ? `@${String(author).replace(/^@/, "")}` : undefined,
        authorName: asString(first(r, AUTHOR_NAME_FIELDS)),
        posted: toDate(first(r, DATE_FIELDS)),
      });
    }
  }
  return out;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}
