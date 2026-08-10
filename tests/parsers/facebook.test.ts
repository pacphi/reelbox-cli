import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFacebookExport } from "../../src/parsers/facebook.js";

describe("parseFacebookExport", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-fb-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("walks a top-level array of entries and extracts url/timestamp/title tolerantly", () => {
    writeFileSync(
      join(dir, "saved_items_and_collections.json"),
      JSON.stringify([
        {
          title: "You saved Jane Doe's reel",
          timestamp: 1730678400,
          attachments: [{ data: [{ external_context: { url: "https://www.facebook.com/reel/1234567890123456" } }] }],
        },
      ]),
    );

    const reels = parseFacebookExport(dir);
    expect(reels).toHaveLength(1);
    expect(reels[0]).toMatchObject({
      key: "fb:1234567890123456",
      url: "https://www.facebook.com/reel/1234567890123456",
      platform: "facebook",
      authorName: "Jane Doe",
      saved: "2024-11-04",
    });
  });

  it("derives a collection name from a named export file, skipping generic stems", () => {
    // Only the exact GENERIC_STEMS ("saved_items", "your_saved_items",
    // "saved_items_and_collections") are excluded -- any other filename,
    // "saved_" prefix included, becomes the (title-cased) collection name.
    writeFileSync(
      join(dir, "saved_road_trip.json"),
      JSON.stringify([{ url: "https://www.facebook.com/watch?v=987654321" }]),
    );
    writeFileSync(
      join(dir, "saved_items.json"),
      JSON.stringify([{ url: "https://www.facebook.com/watch?v=555555555" }]),
    );

    const reels = parseFacebookExport(dir).sort((a, b) => a.key.localeCompare(b.key));
    const withCollection = reels.find((r) => r.key === "fb:987654321");
    const generic = reels.find((r) => r.key === "fb:555555555");
    expect(withCollection?.collection).toBe("Saved Road Trip");
    expect(generic?.collection).toBeUndefined();
  });

  it("handles an object-of-arrays top-level shape (schema drift)", () => {
    writeFileSync(
      join(dir, "saved_items_and_collections.json"),
      JSON.stringify({
        saved_items_v3: [{ url: "https://www.facebook.com/watch?v=111111111" }],
      }),
    );
    expect(parseFacebookExport(dir)).toHaveLength(1);
  });

  it("skips entries with no resolvable urlKey", () => {
    writeFileSync(
      join(dir, "saved_items_and_collections.json"),
      JSON.stringify([{ url: "https://example.com/nothing" }]),
    );
    expect(parseFacebookExport(dir)).toEqual([]);
  });
});
