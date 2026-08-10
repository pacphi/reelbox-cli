import { describe, expect, it } from "vitest";
import { extractTags, fixMojibake, HASHTAG_RE, slugify } from "../../src/lib/text.js";

describe("fixMojibake", () => {
  it("returns falsy input unchanged", () => {
    expect(fixMojibake(undefined)).toBeUndefined();
    expect(fixMojibake("")).toBe("");
  });

  it("recovers UTF-8 bytes that were mis-decoded as latin-1", () => {
    // "café" UTF-8-encoded then mis-decoded as latin-1, as Meta's DYI export does.
    const utf8Bytes = Buffer.from("café", "utf8");
    const mojibake = utf8Bytes.toString("latin1");
    expect(fixMojibake(mojibake)).toBe("café");
  });

  it("leaves plain ASCII untouched", () => {
    expect(fixMojibake("chefsteps")).toBe("chefsteps");
  });

  it("falls back to the original string when the fix would introduce U+FFFD", () => {
    // A raw string containing the replacement character already; re-decoding
    // should not "fix" it into something with fewer/garbled replacement chars.
    const input = "abc�def";
    expect(fixMojibake(input)).toBe(input);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Sous Vide Basics")).toBe("sous-vide-basics");
  });

  it("strips punctuation", () => {
    expect(slugify("Chef's Steps: Perfect Steak!")).toBe("chefs-steps-perfect-steak");
  });

  it("collapses runs of whitespace/underscore/hyphen into one hyphen", () => {
    expect(slugify("a   b__c---d")).toBe("a-b-c-d");
  });

  it("trims leading/trailing hyphens after truncation", () => {
    expect(slugify("a-b-c", 3)).toBe("a-b");
  });

  it("returns 'untitled' for input that slugifies to nothing", () => {
    expect(slugify("!!!")).toBe("untitled");
    expect(slugify("")).toBe("untitled");
  });

  it("normalizes accented characters via NFKD stripping of diacritics", () => {
    expect(slugify("café")).toBe("cafe");
  });

  it("truncates to maxLen", () => {
    const long = "a".repeat(100);
    expect(slugify(long, 10)).toHaveLength(10);
  });
});

describe("HASHTAG_RE", () => {
  it("matches word-character hashtags", () => {
    expect("great #cooking tip #sous_vide".match(HASHTAG_RE)).toEqual(["#cooking", "#sous_vide"]);
  });
});

describe("extractTags", () => {
  it("returns [] for undefined or captions with no hashtags", () => {
    expect(extractTags(undefined)).toEqual([]);
    expect(extractTags("no hashtags here")).toEqual([]);
  });

  it("extracts and lowercases hashtags", () => {
    expect(extractTags("Perfect #Steak every time #SousVide")).toEqual(["steak", "sousvide"]);
  });

  it("dedupes repeated hashtags", () => {
    expect(extractTags("#cooking #Cooking #COOKING")).toEqual(["cooking"]);
  });

  it("caps the result at `max` tags", () => {
    const caption = Array.from({ length: 20 }, (_, i) => `#tag${i}`).join(" ");
    expect(extractTags(caption, 5)).toHaveLength(5);
  });
});
