---
name: release
description: Cut and publish a new reelbox release by walking docs/RELEASING.md's checklist end to end (verify clean state, bump version, tag, push, watch the publish workflow, confirm the npm dist-tag).
---

# /release — cut a reelbox release

Follow [docs/RELEASING.md](../../docs/RELEASING.md) — that file is the
source of truth; if it and this command ever disagree, trust the doc and
flag the mismatch. This command exists so the checklist gets followed in
order, not to duplicate its content.

## Steps

1. **Verify clean state.** `git status` — must be on `main`, no uncommitted
   changes, up to date with `origin/main` (`git pull --ff-only` if not). If
   anything is dirty, stop and tell the user; don't stash-and-continue
   silently for a release.

2. **Run the gate.** `pnpm check` (typecheck, lint:md, build, test) and
   `pnpm audit`. Both must be clean. If `pnpm audit` finds something, treat
   it like the adm-zip finding from this repo's history — a real issue to
   fix or a deliberate, explained exception, never silently ignored.

3. **Determine the new version.** If the user gave one (e.g. `/release
   1.3.0` or "bump the minor version"), use it. Otherwise ask — don't guess
   whether this is a patch/minor/major bump; that's a product decision, not
   a mechanical one. Prereleases (`-beta.1` etc.) go to the npm `next`
   dist-tag on publish; stable versions go to `latest` — see the version
   table in docs/RELEASING.md if the user needs the distinction explained.

4. **Edit `package.json`'s `version` field** — the only place the version
   lives in this repo. Then `pnpm build && node dist/index.js --version` to
   confirm the built CLI reports the new version before anything is
   committed.

5. **Commit and push main:**
   ```bash
   git commit -am "release: v<version>"
   git push origin main
   ```

6. **Confirm before tagging.** Tagging and pushing the tag is the actual
   publish trigger (release.yml fires on `v*` tags and, once NPM_TOKEN is
   configured, this step is irreversible in the normal sense — npm forbids
   re-publishing the same version). Show the user the exact tag and confirm
   before running:
   ```bash
   git tag -a v<version> -m "v<version>"
   git push origin v<version>
   ```

7. **Watch the publish:**
   ```bash
   gh run list --workflow=release.yml --limit 1
   gh run watch "$(gh run list --workflow=release.yml -L1 --json databaseId -q '.[0].databaseId')" --exit-status
   ```
   If it fails on the test gate or the tag<->version guard, nothing was
   published — fix and follow docs/RELEASING.md's "If a release goes wrong"
   section rather than re-tagging the same version.

8. **Verify it landed:**
   ```bash
   npm dist-tag ls @pacphi/reelbox-cli
   npm view @pacphi/reelbox-cli@<version> version dist.tarball
   gh release view v<version> --json tagName,isPrerelease
   ```

Report the final state plainly: what version published, to which dist-tag,
and a link to the GitHub Release.
