import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadState, saveState, upsert } from "../../src/lib/state.js";
import type { Reel, State } from "../../src/types.js";

describe("state", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-state-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("loadState", () => {
    it("returns a fresh empty state when the file does not exist", () => {
      const state = loadState(join(dir, "missing.json"));
      expect(state.version).toBe(1);
      expect(state.reels).toEqual({});
      expect(typeof state.generatedAt).toBe("string");
    });

    it("loads and parses an existing state file", () => {
      const path = join(dir, "state.json");
      const seed: State = {
        version: 1,
        generatedAt: "2025-01-01T00:00:00.000Z",
        reels: { "ig:abc": { key: "ig:abc", url: "https://x", platform: "instagram", tags: [] } },
      };
      saveState(path, seed);
      const loaded = loadState(path);
      expect(loaded.reels["ig:abc"].url).toBe("https://x");
    });

    it("throws for a JSON file that isn't a reelbox state file", () => {
      const path = join(dir, "bogus.json");
      writeFileSync(path, JSON.stringify({ foo: "bar" }));
      expect(() => loadState(path)).toThrow(/not a reelbox state file/);
    });
  });

  describe("saveState", () => {
    it("creates parent directories that don't exist yet", () => {
      const path = join(dir, "nested", "deeper", "state.json");
      saveState(path, { version: 1, generatedAt: "", reels: {} });
      expect(existsSync(path)).toBe(true);
    });

    it("stamps a fresh generatedAt timestamp on every save", () => {
      const path = join(dir, "state.json");
      const state: State = { version: 1, generatedAt: "stale", reels: {} };
      saveState(path, state);
      const written = JSON.parse(readFileSync(path, "utf8")) as State;
      expect(written.generatedAt).not.toBe("stale");
      expect(state.generatedAt).not.toBe("stale"); // mutates the passed-in object too
    });
  });

  describe("upsert", () => {
    it("inserts a new reel keyed by r.key", () => {
      const state: State = { version: 1, generatedAt: "", reels: {} };
      const reel: Reel = { key: "ig:abc", url: "https://x", platform: "instagram", tags: [] };
      upsert(state, reel);
      expect(state.reels["ig:abc"]).toBe(reel);
    });

    it("fills in missing fields on an existing reel without overwriting present ones", () => {
      const state: State = {
        version: 1,
        generatedAt: "",
        reels: {
          "ig:abc": {
            key: "ig:abc",
            url: "https://x",
            platform: "instagram",
            author: "@existing",
            tags: [],
          },
        },
      };
      upsert(state, {
        key: "ig:abc",
        url: "https://x",
        platform: "instagram",
        author: "@incoming",
        caption: "new caption",
        tags: ["a", "b"],
      });
      const merged = state.reels["ig:abc"];
      expect(merged.author).toBe("@existing"); // existing field wins
      expect(merged.caption).toBe("new caption"); // missing field filled in
      expect(merged.tags).toEqual(["a", "b"]); // empty tags array replaced
    });

    it("does not overwrite non-empty tags with an incoming tag list", () => {
      const state: State = {
        version: 1,
        generatedAt: "",
        reels: {
          "ig:abc": {
            key: "ig:abc",
            url: "https://x",
            platform: "instagram",
            tags: ["existing"],
          },
        },
      };
      upsert(state, { key: "ig:abc", url: "https://x", platform: "instagram", tags: ["incoming"] });
      expect(state.reels["ig:abc"].tags).toEqual(["existing"]);
    });
  });
});
