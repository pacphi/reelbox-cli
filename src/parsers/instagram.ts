import type { Reel } from "../types.js";
import { readExportJson } from "./exportReader.js";
import { urlKey } from "../lib/urlKey.js";
import { fixMojibake } from "../lib/text.js";
import { toDate } from "../lib/dates.js";

interface IgSavedEntry {
  title?: string;
  string_map_data?: Record<string, { href?: string; timestamp?: number }>;
}

/** Instagram DYI export: your_instagram_activity/saved/saved_posts.json */
export function parseInstagramExport(root: string): Reel[] {
  const reels: Reel[] = [];
  for (const { data } of readExportJson(root, "saved")) {
    const entries = (data as { saved_saved_media?: IgSavedEntry[] })?.saved_saved_media;
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const author = fixMojibake(e.title);
      let href: string | undefined;
      let ts: number | undefined;
      for (const v of Object.values(e.string_map_data ?? {})) {
        href ||= v.href;
        ts ||= v.timestamp;
      }
      const key = urlKey(href);
      if (!key || !href) continue;
      reels.push({
        key,
        url: href,
        platform: "instagram",
        author: author ? `@${author}` : undefined,
        saved: toDate(ts),
        tags: [],
      });
    }
  }
  return reels;
}
