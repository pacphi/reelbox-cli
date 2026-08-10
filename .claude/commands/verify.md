---
name: verify
description: Run reelbox's full local quality gate (typecheck, markdown lint, build, test, dependency audit) and report a clear pass/fail summary — the same checks CI runs, before you commit or open a PR.
---

# /verify — run the reelbox quality gate

Run, in order, stopping to report clearly on failure rather than plowing
ahead:

```bash
pnpm run check   # typecheck -> lint:md -> build -> test
pnpm audit
```

`pnpm run check` already chains typecheck, markdown lint, build, and the
vitest suite (88+ tests covering `src/lib`, `src/parsers`, `src/markdown`
at 90–100% line coverage; `src/commands/*.ts` has no automated tests —
verify those manually per CONTRIBUTING.md if you touched one).

## Reporting

For each of the five checks (typecheck, lint:md, build, test, audit), state
pass/fail plainly. On failure:

- Show the relevant error output, not the full raw log.
- Don't attempt to auto-fix unless the user asks — this command's job is
  to give an honest verdict, not to silently patch things.
- If `pnpm audit` finds a vulnerability, treat it the way this repo has
  before (see git history around the adm-zip fix): is there a patched
  version available (`pnpm outdated` will show it)? If it's a same-minor
  upgrade with no breaking change, say so and offer to apply it; if it's a
  major bump, flag it and let the user decide rather than upgrading
  unilaterally.

If everything passes, say so in one line — don't pad a clean result with
unnecessary detail.
