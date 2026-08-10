# Releasing reelbox

How to cut and publish a new version of `@pacphi/reelbox-cli` to npm. For
day-to-day dev work see [CONTRIBUTING.md](../CONTRIBUTING.md).

> **Status:** the publish workflow below is wired up and ready, but the
> package has not shipped its first npm release yet. `NPM_TOKEN` must be
> added as a repository secret before pushing a tag will succeed (see
> [Requirements](#requirements-for-publishing-to-work)).

## How it works

Publishing is driven **entirely by pushing a `v*` tag** —
[`.github/workflows/release.yml`](../.github/workflows/release.yml) re-runs the
test gate, enforces `tag == package.json version`, builds, and
`pnpm publish`es with npm provenance. There is no manual `npm publish` step,
and you should never run one locally.

After a successful publish, the workflow automatically creates the matching
GitHub Release with auto-generated notes.

`package.json`'s `version` field is the single source of truth — it isn't
duplicated anywhere else in the repo.

## Version → npm dist-tag

| Version | Example | dist-tag | Meaning |
|---|---|---|---|
| Prerelease (`-...`) | `1.3.0-beta.1` | **`next`** | Preview channel; `npm install @pacphi/reelbox-cli@next` |
| Stable | `1.3.0` | **`latest`** | GA; what plain `npm install @pacphi/reelbox-cli` gets |

## Checklist

```bash
# 0. Be on an up-to-date main with the release contents already merged.
git checkout main && git pull --ff-only
pnpm build && pnpm test                     # must be green — CI re-checks anyway

# 1. Bump the version (edit package.json — the ONLY place it lives).
#    e.g. 1.2.0 -> 1.3.0

# 2. Sanity-check the CLI reports the new version.
pnpm build && node dist/index.js --version  # -> 1.3.0

# 3. Commit with the release convention and push main.
git commit -am "release: v1.3.0"
git push origin main

# 4. Tag (annotated) to match EXACTLY, and push the tag — this is the deploy trigger.
git tag -a v1.3.0 -m "v1.3.0"
git push origin v1.3.0

# 5. Watch the publish.
gh run list --workflow=release.yml --limit 1
gh run watch "$(gh run list --workflow=release.yml -L1 --json databaseId -q '.[0].databaseId')" --exit-status

# 6. Verify it landed on the right dist-tag.
npm dist-tag ls @pacphi/reelbox-cli
npm view @pacphi/reelbox-cli@1.3.0 version dist.tarball

# 7. Confirm the GitHub Release object was created (automatic, after publish).
gh release view v1.3.0 --json tagName,isPrerelease
```

**The tag ↔ version guard is unforgiving:** if the tag name and
`package.json`'s version don't match, `release.yml` fails before publishing.
That's the safety net — if a release run fails on the guard, you tagged the
wrong string.

## Requirements for publishing to work

- **`NPM_TOKEN` repository secret** — an npm **Automation** token with
  publish rights for the `@pacphi` scope. Set it with:

  ```bash
  gh secret set NPM_TOKEN
  ```

- `release.yml` already has `id-token: write` for provenance attestation —
  keep it; don't strip permissions when editing the workflow.
- The package publishes with `--access public` (required for a scoped
  package to be publicly installable) and only ships `dist/`,
  `package.json`, `README.md`, and `LICENSE` — see the `files` field in
  `package.json`.

## If a release goes wrong

- **Failed on the guard / tests:** the package was NOT published. Fix, then
  move the tag (`git tag -d vX && git push origin :vX`, correct, re-tag,
  re-push) or cut the next patch instead.
- **Published a bad version:** don't try to re-publish the same version (npm
  forbids it). Publish a superseding version. Use
  `npm deprecate @pacphi/reelbox-cli@X "..."` to warn installers;
  `npm unpublish` is a last resort and time-limited by npm policy.
- **Wrong dist-tag:** `npm dist-tag add @pacphi/reelbox-cli@X next` / `...
  latest` to correct it without republishing.
