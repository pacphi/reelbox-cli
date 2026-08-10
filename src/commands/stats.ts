import { Command } from "commander";
import { loadState } from "../lib/state.js";

interface StatsOptions {
  state: string;
  json?: boolean;
  top: string;
}

function tally<T>(items: T[], key: (t: T) => string | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return new Map([...m].sort((a, b) => b[1] - a[1]));
}

function printSection(title: string, m: Map<string, number>, top: number): void {
  if (m.size === 0) return;
  console.log(`\n${title}`);
  for (const [k, n] of [...m].slice(0, top)) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }
  if (m.size > top) console.log(`  ... and ${m.size - top} more`);
}

export function registerStats(program: Command): void {
  program
    .command("stats")
    .summary("summarize the library: platforms, authors, tags, months")
    .description(
      "Read the state file and print a summary: totals per platform, top authors, " +
        "top tags, saves per month, categories (if classified), and enrichment " +
        "coverage. Use --json for machine-readable output.",
    )
    .option("-s, --state <file>", "state file to read", "reelbox.state.json")
    .option("-t, --top <n>", "how many rows per section", "10")
    .option("--json", "output the full summary as JSON instead of text")
    .action((opts: StatsOptions) => {
      const top = Number.parseInt(opts.top, 10) || 10;
      const reels = Object.values(loadState(opts.state).reels);
      if (reels.length === 0) {
        throw new Error(`state file ${opts.state} is empty — run 'reelbox extract' first`);
      }

      const platforms = tally(reels, (r) => r.platform);
      const authors = tally(reels, (r) => r.author ?? r.authorName);
      const tags = tally(reels.flatMap((r) => r.tags.map((t) => ({ t }))), (x) => x.t);
      const months = new Map(
        [...tally(reels, (r) => (r.saved ?? r.posted)?.slice(0, 7))].sort((a, b) =>
          b[0].localeCompare(a[0]),
        ),
      );
      const categories = tally(reels, (r) => r.category);
      const collections = tally(reels, (r) => r.collection);
      const enriched = reels.filter((r) => r.caption).length;

      if (opts.json) {
        const obj = (m: Map<string, number>) => Object.fromEntries(m);
        console.log(
          JSON.stringify(
            {
              total: reels.length,
              enrichedCaptions: enriched,
              platforms: obj(platforms),
              authors: obj(authors),
              tags: obj(tags),
              savesPerMonth: obj(months),
              categories: obj(categories),
              collections: obj(collections),
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log(`${reels.length} reels · ${enriched} with captions (${Math.round((enriched / reels.length) * 100)}% enriched)`);
      printSection("By platform", platforms, top);
      printSection("Top authors", authors, top);
      printSection("Top tags", tags, top);
      printSection("Saves per month", months, top);
      printSection("Collections", collections, top);
      printSection("Categories", categories, top);
    });
}
