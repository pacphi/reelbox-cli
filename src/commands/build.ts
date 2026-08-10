import { Command } from "commander";
import { loadState } from "../lib/state.js";
import { writeLibrary } from "../markdown/emit.js";
import type { Taxonomy } from "../types.js";

export interface BuildOptions {
  state: string;
  out: string;
  taxonomy: Taxonomy;
  index: boolean;
}

const TAXONOMIES: Taxonomy[] = ["collection", "author", "topic", "flat"];

export function runBuild(opts: BuildOptions): void {
  if (!TAXONOMIES.includes(opts.taxonomy)) {
    throw new Error(`--taxonomy must be one of: ${TAXONOMIES.join(", ")}`);
  }
  const state = loadState(opts.state);
  const reels = Object.values(state.reels);
  if (reels.length === 0) {
    throw new Error(`state file ${opts.state} is empty — run 'reelbox extract' first`);
  }
  const { written, indexPath } = writeLibrary(reels, opts.out, opts.taxonomy, opts.index);
  console.log(`Wrote ${written} reel notes${opts.index ? ` + ${indexPath}` : ""} → ${opts.out}`);
}

export function registerBuild(program: Command): void {
  program
    .command("build")
    .summary("emit the Markdown library from the state file")
    .description(
      "Emit the Markdown library: one note per reel with YAML frontmatter (author, " +
        "platform, url, dates, collection, tags), organized into a folder taxonomy, " +
        "plus a root index.md catalog. Idempotent — re-running rewrites in place.",
    )
    .requiredOption("-o, --out <dir>", "output folder for the Markdown library")
    .option("-s, --state <file>", "state file to read", "reelbox.state.json")
    .option(
      "-t, --taxonomy <mode>",
      "folder taxonomy: 'collection' (saved collection/playlist, author fallback), 'author', 'topic' (from 'reelbox classify'), or 'flat'",
      "collection",
    )
    .option("--no-index", "skip writing the root index.md catalog")
    .action((opts: BuildOptions) => runBuild(opts));
}
