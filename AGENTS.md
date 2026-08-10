<!-- Repo-specific guidance for Codex. Machine-wide reference: ~/.codex/AGENTS.md
     (ambidextrous dual-host bridge, when enabled) and ~/.claude/CLAUDE.md (ruflo
     CLI/MCP/hooks/agent-routing reference, shared across hosts on this machine). -->

# reelbox-cli

Turn saved Facebook/Instagram Reels and YouTube Shorts (official Meta DYI /
Google Takeout exports only) into a structured Markdown library.
Zero-credential by design — see README.md for the full verb reference and
pipeline diagram.

## Tech stack & commands

- TypeScript (strict, NodeNext module resolution), Node >= 24, pnpm >= 11.
  `engine-strict=true` in `.npmrc`, an `engines` block, a `preinstall` guard
  (`only-allow pnpm`), and a runtime version check in `src/index.ts` all
  enforce this — never substitute npm/yarn commands.
- `pnpm install` · `pnpm build` (tsc → `dist/`) · `pnpm dev` (tsx, no build
  step) · `pnpm start` (run `dist/index.js`)
- `pnpm test` (vitest, `tests/**/*.test.ts`) · `pnpm test:coverage` — covers
  `src/lib`, `src/parsers`, `src/markdown` (pure logic; 90%+ line coverage).
  `src/commands/*.ts` (Commander wiring + fs/network side effects) has no
  tests — verify those by running the relevant verb against sample export
  data. Run `pnpm build` and `pnpm test` before calling anything done.

## Architecture

`src/index.ts` registers one Commander verb per module in `src/commands/`
(`extract`, `enrich`, `classify`, `stats`, `build`, `run`). Each composes:

- `src/parsers/` — export format readers: `exportReader.ts` (zip/folder
  iteration), `instagram.ts` / `facebook.ts` / `youtube.ts` (DYI/Takeout
  parsers), `enrichment.ts` (Apify/yt-dlp field auto-detection)
- `src/lib/state.ts` — the local JSON state file: dedup by reel key,
  idempotent `upsert` that keeps the richest field. Its path is always a
  caller-supplied flag (e.g. `--out`, the state file argument) — never
  hardcode one.
- `src/markdown/emit.ts` — frontmatter notes + `index.md` catalog
- `src/types.ts` — the `Reel` / `State` / `EnrichmentRecord` shapes shared
  across all of the above

## Project invariants — do not violate

- **Zero-credential by design.** reelbox never logs in anywhere. Do not add
  code that stores, transmits, or prompts for Meta/Google/Instagram
  credentials, cookies, or session tokens. Supported inputs are limited to
  official DYI/Takeout exports plus public enrichment data (Apify dataset
  exports, `yt-dlp --write-info-json` output).
- The only secret in this codebase is `ANTHROPIC_API_KEY`
  (`src/commands/classify.ts`, used to call the Claude API for topic
  classification), read from the environment. Never hardcode it, log it, or
  write it into the state file.
- `extract` / `enrich` / `classify` are idempotent by design — re-running
  `extract` against the same state file only adds new reels, and `classify`
  skips already-categorized ones. Preserve that behavior when touching these
  paths.

## Commit messages

`<type>(<scope>): <description>` — types: `feat`, `fix`, `docs`, `style`,
`refactor`, `perf`, `test`, `chore`. No `Co-Authored-By` trailer unless the
repo explicitly configures and authorizes it (see `~/.claude/CLAUDE.md`).
