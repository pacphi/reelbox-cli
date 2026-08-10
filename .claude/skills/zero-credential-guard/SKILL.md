---
name: zero-credential-guard
description: Reviews reelbox code changes (a diff, a PR, a new file, or the whole repo) against the project's one non-negotiable invariant — reelbox never logs into Facebook, Instagram, YouTube, or Google, and never stores or transmits credentials, cookies, or session tokens for those platforms. Use this before committing, before opening a PR, or whenever new code touches src/commands/, src/parsers/, network calls, or anything reading environment variables/secrets in the reelbox-cli repo. Also use it if the user asks "is this safe to merge", "does this break the zero-credential design", or wants a security-style review of a reelbox change. Not a general security scanner — it checks this one specific, repo-defined rule.
---

# Zero-credential invariant review

reelbox's entire value proposition is "zero-credential by design": it reads
only official DYI/Takeout exports the user already downloaded themselves,
plus public (no-login) enrichment data. This is stated as a hard rule in
`CLAUDE.md`/`AGENTS.md`'s project invariants and marketed as the headline
claim in `README.md`. A single commit that quietly adds a login flow would
break the product's core promise, not just introduce a bug — treat this
review as protecting a promise made to users, not a style nitpick.

## What to check

Look at the diff (or the target file(s), or the whole `src/` tree if asked
to audit broadly) for:

1. **New network calls to Meta/Google/Instagram/Facebook/YouTube domains
   that aren't the documented enrichment/export flow.** The one existing
   exception is `src/commands/classify.ts`'s call to
   `https://api.anthropic.com/v1/messages` using `ANTHROPIC_API_KEY` from
   the environment — that's fine, it's the Claude API, not a tracked
   platform, and only captions/author names are sent. A new `fetch()`,
   `http.request()`, or similar call to `facebook.com`, `instagram.com`,
   `youtube.com`, `google.com`, or their APIs is a hard flag unless it's
   reading from a URL the *user* already has open (that doesn't exist in
   this codebase today — flag it and ask).
2. **Anything resembling a login/auth flow**: username/password fields,
   OAuth token exchange, session/cookie handling, headless-browser
   automation (puppeteer/playwright driving a real login page), or code
   that reads a stored credential for one of the tracked platforms.
3. **Credential/token storage**: writing anything that looks like a Meta,
   Google, Instagram, or Facebook access token, cookie jar, or session ID
   into `src/lib/state.ts`'s state file, a config file, or anywhere on
   disk. `ANTHROPIC_API_KEY` living in `process.env` (never written to
   disk, never logged) is the one sanctioned secret in this codebase — see
   `src/commands/classify.ts` for the reference pattern (read once from
   `process.env`, never persisted, error message tells the user to export
   it themselves).
4. **New required environment variables or CLI flags that imply a login**
   (`--username`, `--password`, `--cookie`, `--session-token`, etc.) for
   any of the tracked platforms.
5. **Dependencies** that are browser-automation or platform-API-client
   libraries with authenticated capabilities (e.g. an Instagram/Facebook
   Graph API SDK, an unofficial IG/FB scraping library) — even if unused
   today, adding one signals a design drift worth questioning.

## What's explicitly fine

Don't flag: reading the official DYI/Takeout export files themselves
(`src/parsers/*.ts`, `src/parsers/exportReader.ts`), the Apify/yt-dlp
enrichment path (`src/parsers/enrichment.ts` — public-page scrapes the user
runs themselves, no reelbox-held credentials), the existing
`ANTHROPIC_API_KEY` usage in `classify.ts`, or anything in `tests/` that
constructs fixture data resembling the above (fixtures aren't real
credentials).

## Verdict format

Report one of:

- **PASS** — no violations found. Say so briefly; don't manufacture
  findings to seem thorough.
- **FLAG** — for each finding: `file:line`, a one-line description of what
  it does, and why it violates the invariant (or why it's ambiguous enough
  to need the user's explicit confirmation before merging). Cite the exact
  code, don't paraphrase vaguely.

If you're unsure whether something counts (e.g. a new public-API
enrichment source that isn't Apify/yt-dlp), say so explicitly and ask
rather than silently passing or silently blocking — this invariant is
strict by design, but false alarms erode trust in the check.
