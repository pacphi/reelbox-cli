import { Command } from "commander";
import { existsSync } from "node:fs";
import { loadEnrichment } from "../parsers/enrichment.js";
import { loadState, saveState } from "../lib/state.js";
import { extractTags } from "../lib/text.js";

export interface EnrichOptions {
  input: string[];
  state: string;
}

export function runEnrich(opts: EnrichOptions): void {
  if (!opts.input || opts.input.length === 0) {
    throw new Error("provide at least one enrichment source: --input <file-or-dir...>");
  }
  for (const p of opts.input) {
    if (!existsSync(p)) throw new Error(`enrichment source not found: ${p}`);
  }

  const state = loadState(opts.state);
  const total = Object.keys(state.reels).length;
  if (total === 0) throw new Error(`state file ${opts.state} is empty — run 'reelbox extract' first`);

  const enrichment = loadEnrichment(opts.input);
  let hits = 0;
  for (const [key, rec] of enrichment) {
    const reel = state.reels[key];
    if (!reel) continue;
    reel.caption ||= rec.caption;
    reel.author ||= rec.author;
    reel.authorName ||= rec.authorName;
    reel.posted ||= rec.posted;
    if (reel.tags.length === 0) reel.tags = extractTags(reel.caption);
    hits++;
  }
  saveState(opts.state, state);
  console.log(
    `Enrichment: matched ${hits}/${total} reels (${enrichment.size} enrichment records loaded)`,
  );
  console.log(`State → ${opts.state}`);
}

export function registerEnrich(program: Command): void {
  program
    .command("enrich")
    .summary("merge public metadata (captions, authors) into the state file")
    .description(
      "Merge enrichment JSON into the state file — full captions, author handles and " +
        "display names, post dates, and hashtags-as-tags. Accepts Apify dataset exports " +
        "and yt-dlp --write-info-json output (files or directories); field names are " +
        "auto-detected and records are matched to your saved reels by reel ID. " +
        "Existing values are never overwritten.",
    )
    .requiredOption(
      "-i, --input <paths...>",
      "enrichment JSON file(s) or directorie(s): Apify dataset export, yt-dlp .info.json",
    )
    .option("-s, --state <file>", "state file to update", "reelbox.state.json")
    .action((opts: EnrichOptions) => runEnrich(opts));
}
