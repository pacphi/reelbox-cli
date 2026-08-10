import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseYoutubeExport } from "../../src/parsers/youtube.js";

describe("parseYoutubeExport", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-yt-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("parses video-id,timestamp CSV rows into Reels", () => {
    // readExportText matches on the "playlists" hint in the path, mirroring
    // Takeout's real "YouTube and YouTube Music/playlists/*.csv" layout.
    mkdirSync(join(dir, "playlists"));
    writeFileSync(
      join(dir, "playlists", "Watch later-videos.csv"),
      "Video ID,Playlist Video Creation Timestamp\ndQw4w9WgXcQ,2024-11-04T00:00:00Z\n",
    );
    const reels = parseYoutubeExport(dir);
    expect(reels).toHaveLength(1);
    expect(reels[0]).toMatchObject({
      key: "yt:dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "youtube",
      saved: "2024-11-04",
      collection: "Watch later",
    });
  });

  it("derives the playlist name from the filename, stripping -videos/-playlist suffixes", () => {
    mkdirSync(join(dir, "playlists"));
    writeFileSync(join(dir, "playlists", "Liked videos-videos.csv"), "dQw4w9WgXcQ,2024-01-01\n");
    expect(parseYoutubeExport(dir)[0].collection).toBe("Liked videos");
  });

  it("skips the header row and any row whose first column isn't an 11-char video id", () => {
    writeFileSync(
      join(dir, "playlists.csv"),
      "Video ID,Playlist Video Creation Timestamp\nnotanid,2024-01-01\ndQw4w9WgXcQ,2024-01-01\n",
    );
    expect(parseYoutubeExport(dir)).toHaveLength(1);
  });

  it("strips surrounding quotes and whitespace from CSV columns", () => {
    writeFileSync(join(dir, "playlists.csv"), '"dQw4w9WgXcQ" , "2024-01-01" \n');
    const reels = parseYoutubeExport(dir);
    expect(reels[0].key).toBe("yt:dQw4w9WgXcQ");
    expect(reels[0].saved).toBe("2024-01-01");
  });

  it("skips blank lines", () => {
    writeFileSync(join(dir, "playlists.csv"), "\n\ndQw4w9WgXcQ,2024-01-01\n\n");
    expect(parseYoutubeExport(dir)).toHaveLength(1);
  });

  it("returns [] when no playlist CSVs are present", () => {
    writeFileSync(join(dir, "not-a-playlist.txt"), "dQw4w9WgXcQ,2024-01-01");
    expect(parseYoutubeExport(dir)).toEqual([]);
  });
});
