import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Reel, Taxonomy } from "../types.js";
import { slugify, HASHTAG_RE } from "../lib/text.js";

function yamlEscape(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function reelMarkdown(r: Reel): string {
  const fm: string[] = ["---"];
  if (r.author) fm.push(`author: ${yamlEscape(r.author)}`);
  if (r.authorName) fm.push(`author_name: ${yamlEscape(r.authorName)}`);
  fm.push(`platform: ${r.platform}`);
  fm.push(`url: ${r.url}`);
  if (r.posted) fm.push(`posted: ${r.posted}`);
  if (r.saved) fm.push(`saved: ${r.saved}`);
  if (r.collection) fm.push(`collection: ${yamlEscape(r.collection)}`);
  if (r.category) fm.push(`category: ${yamlEscape(r.category)}`);
  if (r.tags.length > 0) fm.push(`tags: [${[...new Set(r.tags)].sort().join(", ")}]`);
  fm.push("---");

  const who = r.author ?? r.authorName ?? "Unknown author";
  let firstLine = "";
  if (r.caption) {
    firstLine = r.caption.trim().split("\n")[0].replace(HASHTAG_RE, "");
    firstLine = firstLine.replace(/\s+/g, " ").trim().slice(0, 80).replace(/[ .,;:—-]+$/, "");
  }
  const heading = `# ${who}${firstLine ? ` — ${firstLine}` : ""}`;

  const body = [
    heading,
    "",
    `[Watch reel](${r.url})`,
    "",
    r.caption?.trim() ??
      "_No caption available — run `reelbox enrich` with an enrichment dataset to pull the full text._",
  ];
  return `${fm.join("\n")}\n\n${body.join("\n")}\n`;
}

export function folderFor(r: Reel, taxonomy: Taxonomy): string {
  if (taxonomy === "flat") return "";
  if (taxonomy === "author") return slugify(r.author ?? r.authorName ?? "unknown-author");
  if (taxonomy === "topic") return slugify(r.category ?? "unsorted");
  if (r.collection) return slugify(r.collection);
  return slugify(r.author ?? r.authorName ?? "unsorted");
}

export interface BuildResult {
  written: number;
  indexPath: string;
}

export function writeLibrary(
  reels: Reel[],
  out: string,
  taxonomy: Taxonomy,
  withIndex: boolean,
): BuildResult {
  mkdirSync(out, { recursive: true });
  const rows: string[] = [];
  let written = 0;

  const sorted = [...reels].sort((a, b) =>
    `${b.saved ?? ""}${b.key}`.localeCompare(`${a.saved ?? ""}${a.key}`),
  );

  for (const r of sorted) {
    const sub = folderFor(r, taxonomy);
    const folder = sub ? join(out, sub) : out;
    mkdirSync(folder, { recursive: true });
    const date = r.posted ?? r.saved ?? "undated";
    const who = slugify((r.author ?? r.authorName ?? "unknown").replace(/^@/, ""), 24);
    const shortcode = r.key.split(":", 2)[1];
    const file = join(folder, `${date}-${who}-${shortcode}.md`);
    writeFileSync(file, reelMarkdown(r), "utf8");
    written++;
    const rel = sub ? `${sub}/${date}-${who}-${shortcode}.md` : `${date}-${who}-${shortcode}.md`;
    rows.push(
      `| ${r.author ?? r.authorName ?? "—"} | ${r.platform} | ${r.collection ?? "—"} | ${r.category ?? "—"} | ${date} | [note](${rel}) · [reel](${r.url}) |`,
    );
  }

  const indexPath = join(out, "index.md");
  if (withIndex) {
    const index = [
      "# Reel library",
      "",
      `_${written} reels · generated ${new Date().toISOString().slice(0, 10)}_`,
      "",
      "| Author | Platform | Collection | Category | Date | Links |",
      "|---|---|---|---|---|---|",
      ...rows,
      "",
    ];
    writeFileSync(indexPath, index.join("\n"), "utf8");
  }
  return { written, indexPath };
}
