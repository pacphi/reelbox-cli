# Contributing to reelbox

Dev setup, testing, and PR conventions for anyone working on the CLI itself.
User-facing usage lives in [docs/USAGE.md](docs/USAGE.md); publishing a new
version is [docs/RELEASING.md](docs/RELEASING.md).

## Dev setup

```bash
corepack enable   # or: npm i -g pnpm@11 — pnpm >= 11 required, npm/yarn are blocked
git clone https://github.com/pacphi/reelbox-cli.git
cd reelbox-cli
pnpm install
pnpm dev --help   # run the CLI from source via tsx, no build step
```

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm dev <args>` | Run the CLI from `src/` via `tsx`, no build step |
| `pnpm build` | Type-check and compile `src/` → `dist/` (`tsc`) |
| `pnpm start` | Run the built CLI (`node dist/index.js`) |
| `pnpm test` | Run the vitest suite once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:coverage` | Run tests with a v8 coverage report |
| `pnpm typecheck` | `tsc --noEmit` — type-check without writing `dist/` |
| `pnpm lint:md` / `lint:md:fix` | markdownlint-cli2 over README/CLAUDE/AGENTS/CONTRIBUTING/`docs/**` |
| `pnpm audit` / `audit:fix` | `pnpm audit --audit-level=moderate` (and pnpm's `--fix=override`) |
| `pnpm outdated` | List dependencies with a newer version available |
| `pnpm upgrade` | `pnpm up` — bump dependencies within their current semver range |
| `pnpm check` | The full local gate: typecheck → lint:md → build → test |

Before opening a PR, `pnpm check` must be clean — it's the same gate CI runs
(split across the `build` and `quality` jobs in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

```bash
pnpm check
```

## Test coverage expectations

`tests/` mirrors `src/` and currently covers `src/lib`, `src/parsers`, and
`src/markdown` — the pure parsing/formatting logic — at 90%+ line coverage.
`src/commands/*.ts` (Commander wiring plus fs/network side effects) has no
automated tests yet; verify changes there by running the relevant verb
against sample export data (see [docs/USAGE.md](docs/USAGE.md)).

When you add or change logic in `src/lib`, `src/parsers`, or `src/markdown`,
add or update the matching test file under `tests/`. Tests use real
temp-directory fixtures (`mkdtempSync`) rather than mocking `node:fs` —
match that style; it exercises the actual export-reading code path instead
of asserting against a mock.

## Code conventions

- TypeScript strict mode, NodeNext module resolution — imports use explicit
  `.js` extensions (`from "../lib/state.js"`), matching the compiled output.
- No JS/TS linter is configured yet; `tsc` (`pnpm typecheck` / `pnpm build`)
  is the only static gate on source. Markdown docs are linted
  (`pnpm lint:md`). Keep formatting consistent with the surrounding file.
- Zero-credential invariant: never add code that stores, transmits, or
  prompts for Meta/Google/Instagram credentials, cookies, or session tokens.
  Only official DYI/Takeout exports and public enrichment data are valid
  inputs — see the project invariants in [CLAUDE.md](CLAUDE.md) /
  [AGENTS.md](AGENTS.md) for the full list.

## Commit messages

`<type>(<scope>): <description>` — types: `feat`, `fix`, `docs`, `style`,
`refactor`, `perf`, `test`, `chore`. No `Co-Authored-By` trailer.

## Branching / PRs

Single-maintainer repo, kept simple:

- Small, obviously-safe changes (docs, a one-line fix) can land directly on
  `main`.
- Anything else: short-lived branch → PR → squash-merge, with CI
  (`.github/workflows/ci.yml`) green before merging.

```bash
git checkout -b feat/thing
# ... work, with `pnpm check` green ...
git push -u origin feat/thing
gh pr create --fill
gh pr merge --squash --delete-branch
```

## Reporting issues

Open a [GitHub issue](https://github.com/pacphi/reelbox-cli/issues) with the
verb you ran, the flags you passed (redact any real Meta/Google export
paths/URLs if they're sensitive), and the error output. Never attach your
actual export archive or `ANTHROPIC_API_KEY`.
