import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadEnrichment } from "../../src/parsers/enrichment.js";

describe("loadEnrichment", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-enrich-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("indexes an Apify-shaped dataset array by urlKey", () => {
    const path = join(dir, "apify_dataset.json");
    writeFileSync(
      path,
      JSON.stringify([
        {
          url: "https://www.instagram.com/reel/Cxyz123/",
          caption: "Full caption text",
          ownerUsername: "chefsteps",
          ownerFullName: "ChefSteps",
          timestamp: "2025-11-01T00:00:00Z",
        },
      ]),
    );

    const map = loadEnrichment([path]);
    const rec = map.get("ig:Cxyz123");
    expect(rec).toEqual({
      caption: "Full caption text",
      author: "@chefsteps",
      authorName: "ChefSteps",
      posted: "2025-11-01",
    });
  });

  it("auto-detects yt-dlp .info.json field names", () => {
    const path = join(dir, "video.info.json");
    writeFileSync(
      path,
      JSON.stringify({
        webpage_url: "https://youtu.be/dQw4w9WgXcQ",
        description: "yt-dlp description",
        uploader_id: "somechannel",
        upload_date: "20241104",
      }),
    );
    const map = loadEnrichment([path]);
    const rec = map.get("yt:dQw4w9WgXcQ");
    expect(rec?.caption).toBe("yt-dlp description");
    expect(rec?.author).toBe("@somechannel");
    expect(rec?.posted).toBe("2024-11-04");
  });

  it("normalizes an already-@-prefixed author without doubling the @", () => {
    const path = join(dir, "a.json");
    writeFileSync(
      path,
      JSON.stringify({ url: "https://www.instagram.com/reel/abcdef/", username: "@already" }),
    );
    expect(loadEnrichment([path]).get("ig:abcdef")?.author).toBe("@already");
  });

  it("skips records with no resolvable urlKey", () => {
    const path = join(dir, "a.json");
    writeFileSync(path, JSON.stringify({ caption: "no url here" }));
    expect(loadEnrichment([path]).size).toBe(0);
  });

  it("skips files that fail to parse, logging but not throwing", () => {
    const path = join(dir, "broken.json");
    writeFileSync(path, "{not json");
    expect(() => loadEnrichment([path])).not.toThrow();
    expect(loadEnrichment([path]).size).toBe(0);
  });

  it("recurses into directories collecting every .json file", () => {
    const sub = join(dir, "infojson");
    mkdirSync(sub);
    writeFileSync(
      join(sub, "a.info.json"),
      JSON.stringify({ webpage_url: "https://youtu.be/aaaaaaaaaaa", title: "A" }),
    );
    writeFileSync(
      join(sub, "b.info.json"),
      JSON.stringify({ webpage_url: "https://youtu.be/bbbbbbbbbbb", title: "B" }),
    );
    expect(loadEnrichment([sub]).size).toBe(2);
  });

  it("later files/records overwrite earlier ones for the same key", () => {
    const path1 = join(dir, "a.json");
    const path2 = join(dir, "b.json");
    writeFileSync(
      path1,
      JSON.stringify({ url: "https://www.instagram.com/reel/abcdef/", caption: "first" }),
    );
    writeFileSync(
      path2,
      JSON.stringify({ url: "https://www.instagram.com/reel/abcdef/", caption: "second" }),
    );
    expect(loadEnrichment([path1, path2]).get("ig:abcdef")?.caption).toBe("second");
  });
});
