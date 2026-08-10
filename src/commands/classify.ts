import { Command } from "commander";
import { loadState, saveState } from "../lib/state.js";
import type { Reel } from "../types.js";

interface ClassifyOptions {
  state: string;
  categories?: string[];
  model: string;
  batch: string;
  force?: boolean;
  dryRun?: boolean;
}

const API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT =
  "You classify short-form video captions into topic folders for a personal library. " +
  "The user message is JSON: { categories, items }. For each item, pick one category. " +
  "If categories is a non-empty array you MUST use only those values; otherwise invent " +
  "concise reusable topics (1-3 words, Title Case) and reuse them across items. " +
  "Respond with ONLY a JSON object mapping each item id to its category string — " +
  "no prose, no markdown fences.";

async function classifyBatch(
  reels: Reel[],
  opts: ClassifyOptions,
  apiKey: string,
): Promise<Record<string, string>> {
  const items = reels.map((r) => ({
    id: r.key,
    author: r.author ?? r.authorName ?? "",
    caption: (r.caption ?? "").slice(0, 500),
  }));
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ categories: opts.categories ?? null, items }),
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [id, cat] of Object.entries(parsed)) {
    if (typeof cat === "string" && cat.trim()) out[id] = cat.trim();
  }
  return out;
}

export async function runClassify(opts: ClassifyOptions): Promise<void> {
  const batchSize = Number.parseInt(opts.batch, 10);
  if (!Number.isFinite(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("--batch must be an integer between 1 and 100");
  }

  const state = loadState(opts.state);
  const all = Object.values(state.reels);
  if (all.length === 0) throw new Error(`state file ${opts.state} is empty — run 'reelbox extract' first`);

  const pending = all.filter((r) => r.caption && (opts.force || !r.category));
  const noCaption = all.filter((r) => !r.caption).length;

  if (opts.dryRun) {
    console.log(
      `Would classify ${pending.length} reels in ${Math.ceil(pending.length / batchSize)} ` +
        `batch(es) with ${opts.model}` +
        (opts.categories?.length ? ` into: ${opts.categories.join(", ")}` : " (open categories)"),
    );
    if (noCaption > 0) {
      console.log(`Skipping ${noCaption} reels with no caption — run 'reelbox enrich' first to cover them.`);
    }
    return;
  }
  if (pending.length === 0) {
    console.log("Nothing to classify — all captioned reels already have a category (use --force to redo).");
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it first (never hardcode keys):\n" +
        "  export ANTHROPIC_API_KEY=sk-ant-...",
    );
  }

  let classified = 0;
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const mapping = await classifyBatch(batch, opts, apiKey);
    for (const [id, cat] of Object.entries(mapping)) {
      if (state.reels[id]) {
        state.reels[id].category = cat;
        classified++;
      }
    }
    saveState(opts.state, state);
    console.log(`  batch ${Math.floor(i / batchSize) + 1}: ${Object.keys(mapping).length} classified`);
  }

  const counts = new Map<string, number>();
  for (const r of Object.values(state.reels)) {
    if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  console.log(`Classified ${classified} reels into ${counts.size} categories:`);
  for (const [cat, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${cat}`);
  }
  if (noCaption > 0) {
    console.log(`Skipped ${noCaption} reels with no caption — run 'reelbox enrich' first to cover them.`);
  }
}

export function registerClassify(program: Command): void {
  program
    .command("classify")
    .summary("assign topic categories to reels with the Claude API")
    .description(
      "Send reel captions (in batches) to the Claude API and store a topic category on " +
        "each reel, enabling 'reelbox build --taxonomy topic'. Only captions are sent — " +
        "run 'reelbox enrich' first. Requires the ANTHROPIC_API_KEY environment " +
        "variable; already-classified reels are skipped unless --force.",
    )
    .option("-s, --state <file>", "state file to update", "reelbox.state.json")
    .option(
      "-c, --categories <names...>",
      "restrict to a fixed category list (otherwise the model picks concise topics)",
    )
    .option("-m, --model <id>", "Claude model to use", "claude-haiku-4-5-20251001")
    .option("-b, --batch <n>", "captions per API request (1-100)", "20")
    .option("--force", "re-classify reels that already have a category")
    .option("--dry-run", "show what would be classified without calling the API")
    .action((opts: ClassifyOptions) => runClassify(opts));
}
