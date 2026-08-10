import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { folderFor, reelMarkdown, writeLibrary } from "../../src/markdown/emit.js";
import type { Reel } from "../../src/types.js";

function reel(overrides: Partial<Reel> = {}): Reel {
  return {
    key: "ig:abc123",
    url: "https://www.instagram.com/reel/abc123/",
    platform: "instagram",
    tags: [],
    ...overrides,
  };
}

describe("reelMarkdown", () => {
  it("emits frontmatter only for fields that are present", () => {
    const md = reelMarkdown(reel());
    expect(md).toContain("platform: instagram");
    expect(md).toContain(`url: ${reel().url}`);
    expect(md).not.toContain("author:");
    expect(md).not.toContain("collection:");
  });

  it("quote-escapes author/collection/category strings", () => {
    const md = reelMarkdown(reel({ author: '@a "quote" b', collection: "Trip\\Notes" }));
    expect(md).toContain('author: "@a \\"quote\\" b"');
    expect(md).toContain('collection: "Trip\\\\Notes"');
  });

  it("sorts and dedupes tags in the frontmatter", () => {
    const md = reelMarkdown(reel({ tags: ["zeta", "alpha", "alpha"] }));
    expect(md).toContain("tags: [alpha, zeta]");
  });

  it("omits the tags line entirely when there are none", () => {
    const md = reelMarkdown(reel({ tags: [] }));
    expect(md).not.toContain("tags:");
  });

  it("builds the heading from author, falling back to authorName then 'Unknown author'", () => {
    expect(reelMarkdown(reel({ author: "@chefsteps" }))).toContain("# @chefsteps");
    expect(reelMarkdown(reel({ author: undefined, authorName: "Chef Steps" }))).toContain(
      "# Chef Steps",
    );
    expect(reelMarkdown(reel({ author: undefined, authorName: undefined }))).toContain(
      "# Unknown author",
    );
  });

  it("appends the first caption line (hashtags stripped) to the heading, truncated to 80 chars", () => {
    const md = reelMarkdown(
      reel({ author: "@chefsteps", caption: "Sous vide basics: perfect steak #cooking #sousvide\nrest of caption" }),
    );
    const heading = md.split("\n\n")[1];
    // Hashtags are only stripped from the heading's first line -- the raw
    // caption (hashtags included) is still written out in full in the body.
    expect(heading).toBe("# @chefsteps — Sous vide basics: perfect steak");
    expect(heading).not.toContain("#cooking");
    expect(md).toContain("#cooking #sousvide\nrest of caption");
  });

  it("falls back to a placeholder body when there is no caption", () => {
    const md = reelMarkdown(reel());
    expect(md).toContain("_No caption available");
  });

  it("includes a Watch reel link to the original URL", () => {
    const md = reelMarkdown(reel());
    expect(md).toContain(`[Watch reel](${reel().url})`);
  });
});

describe("folderFor", () => {
  const r = reel({ author: "@chefsteps", authorName: "Chef Steps", collection: "Recipes", category: "Cooking" });

  it("returns '' for the flat taxonomy", () => {
    expect(folderFor(r, "flat")).toBe("");
  });

  it("slugifies the author for the author taxonomy", () => {
    expect(folderFor(r, "author")).toBe("chefsteps");
  });

  it("slugifies the category for the topic taxonomy, falling back to 'unsorted'", () => {
    expect(folderFor(r, "topic")).toBe("cooking");
    expect(folderFor(reel({ author: "@x" }), "topic")).toBe("unsorted");
  });

  it("prefers collection for the default (collection) taxonomy, falling back to author", () => {
    expect(folderFor(r, "collection")).toBe("recipes");
    expect(folderFor(reel({ author: "@chefsteps" }), "collection")).toBe("chefsteps");
    expect(folderFor(reel({}), "collection")).toBe("unsorted");
  });
});

describe("writeLibrary", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-emit-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes one markdown file per reel and reports the count", () => {
    const reels = [reel({ key: "ig:a" }), reel({ key: "ig:b", url: "https://www.instagram.com/reel/b/" })];
    const result = writeLibrary(reels, dir, "flat", false);
    expect(result.written).toBe(2);
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    expect(files).toHaveLength(2);
  });

  it("nests files under the taxonomy folder", () => {
    writeLibrary([reel({ author: "@chefsteps" })], dir, "author", false);
    expect(readdirSync(join(dir, "chefsteps"))).toHaveLength(1);
  });

  it("writes an index.md catalog when withIndex is true, and skips it otherwise", () => {
    const withIndex = writeLibrary([reel()], dir, "flat", true);
    expect(readFileSync(withIndex.indexPath, "utf8")).toContain("# Reel library");

    const dir2 = mkdtempSync(join(tmpdir(), "reelbox-emit-noindex-"));
    try {
      writeLibrary([reel()], dir2, "flat", false);
      expect(readdirSync(dir2)).not.toContain("index.md");
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });

  it("sorts reels newest-saved-first in the index", () => {
    const older = reel({ key: "ig:older", saved: "2024-01-01", author: "@older" });
    const newer = reel({ key: "ig:newer", saved: "2025-01-01", author: "@newer" });
    const { indexPath } = writeLibrary([older, newer], dir, "flat", true);
    const index = readFileSync(indexPath, "utf8");
    expect(index.indexOf("@newer")).toBeLessThan(index.indexOf("@older"));
  });
});
