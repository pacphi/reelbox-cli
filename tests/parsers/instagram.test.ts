import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseInstagramExport } from "../../src/parsers/instagram.js";

describe("parseInstagramExport", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-ig-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("parses saved_saved_media entries into Reels", () => {
    writeFileSync(
      join(dir, "saved_posts.json"),
      JSON.stringify({
        saved_saved_media: [
          {
            title: "chefsteps",
            string_map_data: {
              "Saved on": {
                href: "https://www.instagram.com/reel/Cxyz123/",
                timestamp: 1730678400,
              },
            },
          },
        ],
      }),
    );

    const reels = parseInstagramExport(dir);
    expect(reels).toHaveLength(1);
    expect(reels[0]).toMatchObject({
      key: "ig:Cxyz123",
      url: "https://www.instagram.com/reel/Cxyz123/",
      platform: "instagram",
      author: "@chefsteps",
      saved: "2024-11-04",
    });
    expect(reels[0].tags).toEqual([]);
  });

  it("skips entries whose href does not resolve to a urlKey", () => {
    writeFileSync(
      join(dir, "saved_posts.json"),
      JSON.stringify({
        saved_saved_media: [
          { title: "x", string_map_data: { a: { href: "https://example.com/not-a-reel" } } },
        ],
      }),
    );
    expect(parseInstagramExport(dir)).toEqual([]);
  });

  it("skips files with no saved_saved_media array", () => {
    writeFileSync(join(dir, "saved_posts.json"), JSON.stringify({ something_else: [] }));
    expect(parseInstagramExport(dir)).toEqual([]);
  });

  it("returns [] when nothing in the export matches the 'saved' hint", () => {
    writeFileSync(join(dir, "other.json"), JSON.stringify({ saved_saved_media: [] }));
    expect(parseInstagramExport(dir)).toEqual([]);
  });

  it("fixes mojibake in the author title", () => {
    const mojibake = Buffer.from("café_chef", "utf8").toString("latin1");
    writeFileSync(
      join(dir, "saved_posts.json"),
      JSON.stringify({
        saved_saved_media: [
          {
            title: mojibake,
            string_map_data: { a: { href: "https://www.instagram.com/reel/abcdef/", timestamp: 1 } },
          },
        ],
      }),
    );
    expect(parseInstagramExport(dir)[0].author).toBe("@café_chef");
  });
});
