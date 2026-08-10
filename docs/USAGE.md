# Usage guide

Everything a user needs to install reelbox, request the right platform
exports, and run the extract → enrich → classify → build pipeline. For the
big-picture pitch see [README.md](../README.md); for contributor/dev setup
see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Data sources (all official exports)

reelbox never logs into Facebook, Instagram, or YouTube on your behalf. You
request each export yourself, from the platform's own official self-service
tools, then hand the downloaded file to reelbox. The only logins in the
whole pipeline are the ones you already do with Meta and Google directly.

| Platform | Where to request | What to select |
|---|---|---|
| Facebook | [Meta Accounts Center → Your information and permissions → Download your information](https://www.facebook.com/help/1701730696756992) | *Saved items and collections*, **JSON** format |
| Instagram | Same Accounts Center flow — [Instagram's data download docs](https://help.instagram.com/181231772500920) | *Saved posts*, **JSON** format |
| YouTube | [Google Takeout](https://takeout.google.com/) — see [Google's playlist export docs](https://support.google.com/accounts/answer/14792019) | *YouTube and YouTube Music* → content options → **playlists** only |

### Step-by-step: Facebook / Instagram saved items (Meta Accounts Center)

Meta consolidated both apps' data-export tools into one place:

1. Go to [accountscenter.facebook.com](https://accountscenter.facebook.com/) (works from either the Facebook or Instagram app/site — you'll pick the account below).
2. **Your information and permissions** → **Download your information**.
3. Choose the account (Facebook and/or Instagram) and select **Some of your information**.
4. Pick **Saved items and collections** only — no need to request your whole account archive.
5. Set format to **JSON** (not HTML — reelbox's parsers expect JSON), date range to **All time**.
6. Submit the request. Meta emails/notifies you when the archive is ready to download (usually minutes to a few hours); download the `.zip` and hand it to `reelbox extract --fb ...` / `--ig ...` as-is, unzipped or not.
7. See [Facebook's saved-items download help article](https://www.facebook.com/help/598290484388218) for more detail on this specific flow.

### Step-by-step: YouTube saved Shorts (Google Takeout)

Saved Shorts aren't a separate export category — they live in your regular
YouTube playlists (Watch Later, Liked videos, or any playlist you added them
to), so Takeout's normal playlist export covers them:

1. Go to [takeout.google.com](https://takeout.google.com/) and sign in.
2. **Deselect all**, then select only **YouTube and YouTube Music**.
3. Click **All YouTube data included** and narrow it to **playlists** only (uncheck everything else to keep the export small).
4. Export once, download to computer, **.zip** delivery is fine.
5. Google Takeout exports each playlist as a CSV of video IDs — reelbox parses every `*.csv` under the `playlists/` folder in the archive. See [Google's playlist-export docs](https://support.google.com/accounts/answer/14792019) for background.

### Enrichment (public data, no login)

`reelbox enrich` fills in full captions, author handles, and post dates —
none of which the DYI/Takeout exports include. This step never touches your
account: it reads either

- an [Apify](https://apify.com) dataset export from a public URL-list scraper actor run against the URLs from `reelbox extract --urls-out`, or
- local [`yt-dlp --write-info-json`](https://github.com/yt-dlp/yt-dlp) output for the same URL list.

Both are public-page scrapes with no credentials involved.

## Requirements

- **Node >= 24** (current LTS line)
- **pnpm >= 11**

Both are enforced three ways: `engines` in `package.json` with
`engine-strict=true` in `.npmrc` (installs on older toolchains fail fast), a
`preinstall` guard that blocks `npm install` / `yarn` in favor of pnpm, and a
runtime check in the CLI itself. The `packageManager` field pins the exact
pnpm version, so `corepack enable` alone gives you the right one.
`pnpm-workspace.yaml` also pre-approves the one dependency build script
(esbuild, used by tsx) under pnpm 11's supply-chain protection — no `pnpm
approve-builds` prompt on first install.

## Install

```bash
pnpm add -g @pacphi/reelbox-cli   # once published — see docs/RELEASING.md
```

> `pnpm add -g`, not `npm install -g`: this package's `preinstall` script
> refuses non-pnpm installs (see [CONTRIBUTING.md](../CONTRIBUTING.md)), so
> an `npm install -g` invocation fails outright.

Or from source:

```bash
corepack enable   # or: npm i -g pnpm@11
git clone https://github.com/pacphi/reelbox-cli.git
cd reelbox-cli
pnpm install
pnpm build
pnpm link --global   # optional: makes `reelbox` available on your PATH
```

## Verbs

Every verb and flag has built-in help: `reelbox --help`, `reelbox <verb> --help`.

### `reelbox extract`

Parse exports (zip or extracted folder) into a local state file, deduped by
reel/video ID. Optionally emit the URL list for enrichment.

```bash
reelbox extract --ig instagram-export.zip --fb facebook-export.zip \
                --yt takeout.zip --urls-out urls.txt
```

### `reelbox enrich`

Merge public metadata into the state: full captions, author handles, post
dates, hashtags-as-tags. Accepts Apify dataset exports and yt-dlp
`.info.json` files or directories; field names are auto-detected, records are
matched by reel ID, and existing values are never overwritten.

```bash
# gather enrichment data first, e.g.:
yt-dlp --skip-download --write-info-json -a urls.txt -P infojson/
# ...or run an Apify URL-list actor on urls.txt and download the dataset JSON
reelbox enrich --input apify_dataset.json infojson/
```

### `reelbox classify`

Send captions (in batches) to the Claude API and store a topic category on
each reel — enables `--taxonomy topic`. Requires `ANTHROPIC_API_KEY` in your
environment; only captions and author names are sent. Use `--categories` to
pin a fixed set, `--dry-run` to preview, `--force` to redo.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
reelbox classify --categories Cooking Fitness Travel Tech Other
```

### `reelbox stats`

Summarize the library: totals per platform, top authors, top tags, saves per
month, collections/playlists, categories, and enrichment coverage.
`--json` for machine-readable output.

```bash
reelbox stats
```

### `reelbox build`

Emit the Markdown library to any folder you choose.

```bash
reelbox build --out ~/ReelLibrary --taxonomy topic
```

Taxonomies: `collection` (saved collection / playlist folders, author
fallback), `author`, `topic` (from `classify`), or `flat`.

### `reelbox run`

Extract → enrich → build in one shot:

```bash
reelbox run --ig instagram-export.zip --fb facebook-export.zip --yt takeout.zip \
            --enrich apify_dataset.json --out ~/ReelLibrary
```

## Re-running

Everything is idempotent. Request fresh exports monthly, run `extract` again
against the same state file — only new reels are added — then `build` to
refresh the library. `classify` skips already-categorized reels, so
incremental runs only pay for what's new.

## Note format

```markdown
---
author: "@chefsteps"
platform: instagram
url: https://www.instagram.com/reel/Cxyz123/
posted: 2025-11-01
saved: 2024-11-04
category: "Cooking"
tags: [cooking, sousvide, steak]
---

# @chefsteps — Sous vide basics: perfect steak every time

[Watch reel](https://www.instagram.com/reel/Cxyz123/)

Full caption text, finally readable in one place...
```

## Project layout

```text
src/
├── index.ts             entry point, command registration
├── types.ts             Reel / State / EnrichmentRecord types
├── commands/            one module per verb
│   ├── extract.ts       exports → state (+ urls.txt)
│   ├── enrich.ts        public metadata → state
│   ├── classify.ts      Claude API topic categories → state
│   ├── stats.ts         state → summary
│   ├── build.ts         state → markdown library
│   └── run.ts           extract → enrich → build
├── parsers/
│   ├── exportReader.ts  zip/folder file iteration (JSON + CSV)
│   ├── instagram.ts     IG DYI saved_posts parser
│   ├── facebook.ts      FB DYI saved-items parser (schema-drift tolerant)
│   ├── youtube.ts       Google Takeout playlist CSV parser
│   └── enrichment.ts    Apify / yt-dlp field auto-detection
├── lib/                 urlKey, dates, text (mojibake fix, slugs), state
└── markdown/emit.ts     frontmatter notes + index.md
tests/                   vitest suite mirroring src/ (see CONTRIBUTING.md)
docs/pipeline.svg        the architecture diagram in the README
```
