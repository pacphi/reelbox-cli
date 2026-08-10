<!-- Full ruflo reference: machine-wide ~/.claude/CLAUDE.md (managed by agentic-kit) -->

# reelbox-cli

Turn saved Facebook/Instagram Reels and YouTube Shorts (official Meta DYI /
Google Takeout exports only) into a structured Markdown library.
Zero-credential by design — see README.md for the full verb reference and
pipeline diagram.

## Tech stack & commands

- TypeScript (strict, NodeNext), Node >= 24, pnpm >= 11 — enforced via
  `engines`, `.npmrc`'s `engine-strict=true`, a `preinstall` guard, and a
  runtime check in `src/index.ts`. Never substitute npm/yarn commands.
- `pnpm install` · `pnpm build` (tsc → `dist/`) · `pnpm dev` (tsx) · `pnpm start`
- `pnpm test` (vitest, `tests/**/*.test.ts`) · `pnpm test:coverage` — covers
  `src/lib`, `src/parsers`, `src/markdown` (pure logic; 90%+ line coverage).
  `src/commands/*.ts` (Commander wiring + fs/network side effects) has no
  tests — verify those by running the relevant verb against sample export
  data. Run `pnpm build` and `pnpm test` before calling anything done.

## Architecture

`src/index.ts` registers one verb per module in `src/commands/` (`extract`,
`enrich`, `classify`, `stats`, `build`, `run`). Each composes:

- `src/parsers/` — export readers (`exportReader.ts` zip/folder iteration;
  `instagram.ts`, `facebook.ts`, `youtube.ts` DYI/Takeout parsers;
  `enrichment.ts` Apify/yt-dlp field auto-detection)
- `src/lib/state.ts` — local JSON state file, dedup by reel key, idempotent
  `upsert`. Its path is always a caller-supplied flag — never hardcode one.
- `src/markdown/emit.ts` — frontmatter notes + `index.md` catalog
- `src/types.ts` — shared `Reel` / `State` / `EnrichmentRecord` shapes

## Project invariants — do not violate

- **Zero-credential by design.** Never add code that stores, transmits, or
  prompts for Meta/Google/Instagram credentials, cookies, or session tokens.
  Only official DYI/Takeout exports and public enrichment data (Apify
  dataset exports, `yt-dlp --write-info-json`) are valid inputs.
- The only secret is `ANTHROPIC_API_KEY` (`src/commands/classify.ts`), read
  from the environment — never hardcode, log, or persist it to state.
- `extract` / `enrich` / `classify` are idempotent by design (state upsert
  keeps the richest field; `classify` skips already-categorized reels) —
  preserve that when touching those paths.

## Agentic QE v3
<!-- managed by agentic-kit — aqe init skips regeneration when this sentinel is present -->
