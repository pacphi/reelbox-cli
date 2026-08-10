---
name: new-platform-parser
description: Scaffolds a new saved-content export parser for reelbox (e.g. adding TikTok, Pinterest, or Etsy saves alongside the existing Instagram/Facebook/YouTube support). Use this whenever the user asks to add support for saving/exporting from a new platform, mentions parsing a new export format for reelbox, or wants a new `reelbox extract` data source. Also use it if the user asks "how do I add a new platform to reelbox" or points at an export file from a platform reelbox doesn't yet support. This is reelbox-repo-specific — do not use it for unrelated CLI or parser work.
---

# Adding a new platform parser to reelbox

reelbox turns official export files into `Reel` objects. Every existing
platform (`src/parsers/instagram.ts`, `facebook.ts`, `youtube.ts`) follows
the exact same shape, so adding one more is mechanical *if* every touch
point below is covered — and silently broken (unreachable from the CLI, or
producing un-deduped/miskeyed reels) if any one of them is skipped.

**Non-negotiable: a new platform is not done until it is implemented AND
tested AND both pass.** Don't stop at a parser file that "looks right" —
write the matching test in `tests/parsers/`, run `pnpm test` and
`pnpm build`, and only report success once they're green. Scaffolding that
hasn't been run is not a finished parser; it's a guess. If you can't get a
sample export to test against, build one — the existing tests
(`tests/parsers/instagram.test.ts` etc.) construct realistic fixture JSON
by hand rather than requiring a real downloaded export.

## The five touch points

Read the closest existing parser first (`instagram.ts` for a JSON-based,
single-file-per-item export; `youtube.ts` for a CSV-based export;
`facebook.ts` if the new platform's export schema drifts across versions
and needs tolerant walking). Then touch, in this order:

1. **`src/lib/urlKey.ts`** — add a regex + prefix branch for the new
   platform's URL shapes, e.g. a `TIKTOK_KEY` regex returning `` `tk:${id}` ``.
   This file is the *dedup* mechanism across the whole pipeline (extract,
   enrich, and every parser call `urlKey()` to build a `Reel.key`); a
   platform without an entry here can still produce reels, but they'll
   never dedupe correctly and enrichment will never match them. Add the new
   prefix to the JSDoc-style priority comment at the top so the next person
   knows the order matters (more specific patterns before generic ones).

2. **`src/types.ts`** — extend the `Platform` union
   (`"instagram" | "facebook" | "youtube" | ...`) with the new platform's
   string literal. `Reel.platform` and every downstream consumer
   (`stats.ts`, `emit.ts`'s frontmatter, `folderFor()`'s taxonomy logic)
   are typed against this union, so the compiler will point at every place
   that needs updating once this changes — trust `pnpm typecheck`'s errors
   as your checklist.

3. **`src/parsers/<platform>.ts`** — the parser itself:
   `export function parse<Platform>Export(root: string): Reel[]`. Use
   `readExportJson(root, hint)` (JSON exports) or `readExportText(root,
   hint, exts)` (CSV or other text) from `./exportReader.js` — `hint` is a
   case-insensitive substring match against the file path inside the
   zip/folder, so pick something that appears in the platform's real export
   structure (see how `youtube.ts` uses `"playlists"` to match Takeout's
   `.../playlists/*.csv` layout). For every candidate record: resolve a
   URL, call `urlKey(url)`, and skip the record if `urlKey` returns `null`
   or there's no URL — never fabricate a key. Only set fields you can
   actually populate from the export; leave the rest `undefined` (enrichment
   fills in the gaps later) and `tags: []`.

4. **`src/commands/extract.ts`** — add a CLI flag (follow the `--ig`/`--fb`/`--yt`
   naming convention, e.g. `--tk <path>`), import the new parser, call it
   and `upsert()` its results into `state` alongside the existing three,
   and add it to the `count()` summary line so users see it in the
   "Extracted N unique saved reels" output. Forgetting this step is the
   single most common way a new parser ends up unreachable — it exists and
   compiles, but `reelbox extract` never calls it.

5. **`src/commands/run.ts`** — `run` calls `runExtract()` directly with a
   hand-built options object (`{ ig: opts.ig, fb: opts.fb, yt: opts.yt, ... }`),
   so the new flag needs to be threaded through here too, or `reelbox run`
   will silently drop it even though `reelbox extract` works fine standalone.

## Testing pattern

Match `tests/parsers/*.test.ts`'s style exactly: `mkdtempSync(join(tmpdir(),
"reelbox-<platform>-"))` in `beforeEach`, `rmSync(..., {recursive:true,
force:true})` in `afterEach`, and hand-written fixture files via
`writeFileSync` that mimic the platform's real export shape (check the
platform's actual official export format if you know it — otherwise a
plausible JSON/CSV shape with a URL field, a timestamp, and an author field
is enough to exercise the parser's logic). No `node:fs` mocking — the point
is to exercise the real `readExportJson`/`readExportText` file-walking code
too, not just the parsing logic in isolation. Cover at minimum: a
happy-path record with all fields, a record with no resolvable `urlKey`
(should be skipped, not crash), and whatever schema quirk the platform's
export is known for (optional field, nested structure, nonstandard date
format — `src/lib/dates.ts`'s `toDate()` already handles ISO strings,
`YYYYMMDD`, and unix seconds/millis, so lean on that rather than
reinventing date parsing).

## Before reporting done

```bash
pnpm typecheck   # Platform union changes surface every spot that needs updating
pnpm build       # tsc must compile clean
pnpm test        # the new test file must pass alongside the existing 88+
pnpm lint:md     # only if you touched docs/USAGE.md's platform table
```

If the user only asked "how would I add platform X" without asking you to
actually do it, it's fine to explain the five touch points — but if they
asked you to add it, follow through to a real, passing implementation
rather than stopping at an explanation.
