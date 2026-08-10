import { Command } from "commander";
import { runExtract } from "./extract.js";
import { runEnrich } from "./enrich.js";
import { runBuild } from "./build.js";
import type { Taxonomy } from "../types.js";

interface RunOptions {
  ig?: string;
  fb?: string;
  yt?: string;
  enrich?: string[];
  state: string;
  out: string;
  taxonomy: Taxonomy;
  index: boolean;
  urlsOut?: string;
}

export function registerRun(program: Command): void {
  program
    .command("run")
    .summary("extract → enrich → build in one shot")
    .description(
      "Convenience pipeline: extract from the provided exports, optionally enrich, " +
        "then build the Markdown library. Equivalent to running the three verbs in order " +
        "against the same state file.",
    )
    .option("--ig <path>", "Instagram DYI export (.zip or extracted folder)")
    .option("--fb <path>", "Facebook DYI export (.zip or extracted folder)")
    .option("--yt <path>", "Google Takeout export with YouTube playlists (.zip or extracted folder)")
    .option("-e, --enrich <paths...>", "enrichment JSON file(s)/dir(s) to merge (optional)")
    .requiredOption("-o, --out <dir>", "output folder for the Markdown library")
    .option("-s, --state <file>", "state file to create or update", "reelbox.state.json")
    .option(
      "-t, --taxonomy <mode>",
      "folder taxonomy: 'collection', 'author', or 'flat'",
      "collection",
    )
    .option("--no-index", "skip writing the root index.md catalog")
    .option("--urls-out <file>", "also write the deduped reel URL list")
    .action((opts: RunOptions) => {
      runExtract({ ig: opts.ig, fb: opts.fb, yt: opts.yt, state: opts.state, urlsOut: opts.urlsOut });
      if (opts.enrich && opts.enrich.length > 0) {
        runEnrich({ input: opts.enrich, state: opts.state });
      }
      runBuild({ state: opts.state, out: opts.out, taxonomy: opts.taxonomy, index: opts.index });
    });
}
