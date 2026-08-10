import AdmZip from "adm-zip";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readExportJson, readExportText } from "../../src/parsers/exportReader.js";

describe("readExportText", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-export-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("recursively walks a directory tree for files matching hint + extension", () => {
    mkdirSync(join(dir, "your_instagram_activity", "saved"), { recursive: true });
    writeFileSync(join(dir, "your_instagram_activity", "saved", "saved_posts.json"), "{}");
    writeFileSync(join(dir, "unrelated.json"), "{}");
    writeFileSync(join(dir, "your_instagram_activity", "saved", "readme.txt"), "not json");

    const found = readExportText(dir, "saved", [".json"]);
    expect(found).toHaveLength(1);
    expect(found[0].relPath).toContain("saved_posts.json");
  });

  it("is case-insensitive when matching hint and extension", () => {
    writeFileSync(join(dir, "SAVED_POSTS.JSON"), "{}");
    expect(readExportText(dir, "saved", [".json"])).toHaveLength(1);
  });

  it("reads matching entries out of a .zip archive", () => {
    const zip = new AdmZip();
    zip.addFile("saved/saved_posts.json", Buffer.from('{"a":1}'));
    zip.addFile("other/ignored.json", Buffer.from("{}"));
    const zipPath = join(dir, "export.zip");
    zip.writeZip(zipPath);

    const found = readExportText(zipPath, "saved", [".json"]);
    expect(found).toHaveLength(1);
    expect(found[0].text).toBe('{"a":1}');
  });

  it("throws for a path that is neither a directory nor a .zip file", () => {
    const filePath = join(dir, "notzip.txt");
    writeFileSync(filePath, "hi");
    expect(() => readExportText(filePath, "saved", [".json"])).toThrow(
      /neither a \.zip file nor a directory/,
    );
  });

  it("returns [] when nothing matches", () => {
    writeFileSync(join(dir, "irrelevant.json"), "{}");
    expect(readExportText(dir, "saved", [".json"])).toEqual([]);
  });
});

describe("readExportJson", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "reelbox-export-json-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("parses matching JSON files", () => {
    writeFileSync(join(dir, "saved_posts.json"), JSON.stringify({ a: 1 }));
    const found = readExportJson(dir, "saved");
    expect(found).toEqual([{ relPath: "saved_posts.json", data: { a: 1 } }]);
  });

  it("silently skips files that fail to parse as JSON", () => {
    writeFileSync(join(dir, "saved_broken.json"), "{not valid json");
    writeFileSync(join(dir, "saved_ok.json"), "{}");
    const found = readExportJson(dir, "saved");
    expect(found).toEqual([{ relPath: "saved_ok.json", data: {} }]);
  });
});
