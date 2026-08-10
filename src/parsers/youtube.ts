import { basename } from "node:path";
import type { Reel } from "../types.js";
import { readExportText } from "./exportReader.js";
import { toDate } from "../lib/dates.js";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Google Takeout export: YouTube playlists live under
 * "Takeout/YouTube and YouTube Music/playlists/*.csv" — one CSV per playlist
 * (including Watch Later and Liked videos), rows of video ID + added timestamp.
 * Saved Shorts are ordinary playlist entries; enrichment fills in the rest.
 */
export function parseYoutubeExport(root: string): Reel[] {
  const reels: Reel[] = [];
  for (const { relPath, text } of readExportText(root, "playlists", [".csv"])) {
    const playlist = basename(relPath)
      .replace(/\.csv$/i, "")
      .replace(/[-_](videos|playlist)$/i, "")
      .trim();
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const id = cols[0];
      if (!VIDEO_ID.test(id)) continue;
      reels.push({
        key: `yt:${id}`,
        url: `https://www.youtube.com/watch?v=${id}`,
        platform: "youtube",
        saved: toDate(cols[1]),
        collection: playlist || undefined,
        tags: [],
      });
    }
  }
  return reels;
}
