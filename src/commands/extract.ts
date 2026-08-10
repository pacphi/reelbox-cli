import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseInstagramExport } from "../parsers/instagram.js";
import { parseFacebookExport } from "../parsers/facebook.js";
import { parseYoutubeExport } from "../parsers/youtube.js";
import { loadState, saveState, upsert } from "../lib/state.js";

export interface ExtractOptions {
  ig?: string;
  fb?: string;
  yt?: string;
  state: string;
  urlsOut?: string;
}

export function runExtract(opts: ExtractOptions): void {
  if (!opts.ig && !opts.fb && !opts.yt) {
    throw new Error("provide at least one export: --ig, --fb, and/or --yt <path>");
  }
  for (const p of [opts.ig, opts.fb, opts.yt]) {
    if (p && !existsSync(p)) throw new Error(`export not found: ${p}`);
  }

  const state = loadState(opts.state);
  const before = Object.keys(state.reels).length;

  if (opts.ig) for (const r of parseInstagramExport(opts.ig)) upsert(state, r);
  if (opts.fb) for (const r of parseFacebookExport(opts.fb)) upsert(state, r);
  if (opts.yt) for (const r of parseYoutubeExport(opts.yt)) upsert(state, r);

  const reels = Object.values(state.reels);
  const count = (p: string) => reels.filter((r) => r.platform === p).length;
  console.log(
    `Extracted ${reels.length} unique saved reels/shorts ` +
      `(${count("instagram")} IG / ${count("facebook")} FB / ${count("youtube")} YT, ${reels.length - before} new)`,
  );

  saveState(opts.state, state);
  console.log(`State → ${opts.state}`);

  if (opts.urlsOut) {
    mkdirSync(dirname(opts.urlsOut) || ".", { recursive: true });
    writeFileSync(opts.urlsOut, reels.map((r) => r.url).join("\n") + "\n", "utf8");
    console.log(`URL list (${reels.length}) → ${opts.urlsOut}`);
  }

  if (reels.length === 0) {
    console.error(
      "No reels found — check that the export contains saved items and was requested in JSON (not HTML) format.",
    );
    process.exitCode = 1;
  }
}

export function registerExtract(program: Command): void {
  program
    .command("extract")
    .summary("parse Meta DYI exports into the local state file")
    .description(
      "Parse official platform exports (zip or extracted folder) into reelbox's local " +
        "state file: Meta 'Download Your Information' (Facebook saved items & collections, " +
        "Instagram saved posts) and Google Takeout (YouTube playlists incl. Watch Later " +
        "and Liked videos, where saved Shorts live). Dedupes by reel ID; safe to re-run " +
        "with newer exports. No network access, no logins.",
    )
    .option("--ig <path>", "Instagram DYI export (.zip or extracted folder)")
    .option("--fb <path>", "Facebook DYI export (.zip or extracted folder)")
    .option("--yt <path>", "Google Takeout export with YouTube playlists (.zip or extracted folder)")
    .option("-s, --state <file>", "state file to create or update", "reelbox.state.json")
    .option(
      "--urls-out <file>",
      "also write the deduped reel URL list (feed this to an Apify actor or yt-dlp)",
    )
    .action((opts: ExtractOptions) => runExtract(opts));
}
