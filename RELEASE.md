# Releasing & Publishing

There is no manual `npm publish` step and **no release PR**. Releases are fully
automated via **[semantic-release](https://github.com/semantic-release/semantic-release)**,
driven by GitHub Actions on every push to `main`. This is the right model for a
solo workflow that commits straight to `main`.

## TL;DR

```bash
# 1. write conventional-commit messages as you work
git commit -m "feat: add Unicode support to workflow names"

# 2. push to main -- that's it
git push origin main
```

Pushing to `main` triggers the **Release** workflow
([`.github/workflows/release.yml`](.github/workflows/release.yml)), which builds,
tests, and then publishes to npm if a release is warranted.

## Why not release-please

This repo previously used `release-please`, which is **PR-driven**: it opens a
"release PR" and only tags/publishes when that PR is merged. Committing straight
to `main` (solo workflow, no PRs) meant the release PR was never created or merged,
so `publish` never ran and npm stayed frozen. semantic-release analyzes commits and
releases **directly**, no PR required.

## How a version bump is decided

Versions come from your commit messages, analyzed by
`@semantic-release/commit-analyzer` using
[Conventional Commits](https://www.conventionalcommits.org/).

| Commit type                                    | Bump            |
| ---------------------------------------------- | --------------- |
| `fix(scope): ...`                              | **patch**       |
| `feat(scope): ...`                             | **minor**       |
| `feat!:` or `BREAKING CHANGE:` in the footer  | **major**       |
| `chore:` / `docs:` / `test:` / `style:` / `ci:` | **no release**  |

If the commits since the last release contain nothing releasable, semantic-release
exits without publishing anything.

## What the Release workflow does

On push to `main`, [`.github/workflows/release.yml`](.github/workflows/release.yml)
runs, in order:

1. `npm ci`
2. `npm run build`
3. `npm test`
4. `npx semantic-release`

If those pass, semantic-release ([`.releaserc.json`](.releaserc.json)) then:

1. Determines the next version from the commits.
2. Generates release notes.
3. Updates [`CHANGELOG.md`](CHANGELOG.md).
4. Publishes to npm via `@semantic-release/npm`
   (under `publishConfig: { "access": "public" }`).
5. Commits `package.json` + `package-lock.json` + `CHANGELOG.md` as
   `chore(release): <version> [skip ci]`.
6. Creates a GitHub release and tag (`v<version>`).

The `[skip ci]` in the release commit prevents the next push from retriggering the
workflow, so there's no loop.

## Authentication: npm granular access token

This repo publishes to npm with a **npm Granular Access Token** stored as the
`NPM_TOKEN` repository secret. `@semantic-release/npm` writes `${NPM_TOKEN}` into a
temporary `.npmrc` for the `npm publish` step.

> ⚠ This is **not** npm Trusted Publishing / provenance. The tokenless OIDC path is
> blocked by a bug in `@semantic-release/npm@13` (`oidcContextEstablished()` discards
> the minted token, leaving `.npmrc` empty → `ENEEDAUTH`). That is why the workflow
> grants **only `permissions: contents: write`** and deliberately omits
> `id-token: write` — granting it makes the broken OIDC branch fire and short-circuit
> the working token path.

### One-time setup (npm-side, web UI)

1. On npmjs.com, **Settings → Access Tokens → Create new granular access token**:
   - Expiration: 90 days (npm requires one; rotate before it lapses).
   - Packages: **Read and write** → **Only select packages and scopes** → `groundswell`.
   - Organizations: **No access**.
2. **Packages → groundswell → Settings → Publishing access**: keep
   *"Require two-factor authentication or a granular access token with bypass 2FA
   enabled."* (Do **not** select "disallow tokens".)
3. Add the token as a repo secret: **Settings → Secrets and variables → Actions →
   New repository secret**, name `NPM_TOKEN`.

### Rotation

npm requires granular tokens to expire. Before the 90-day window closes, create a
new token and update the `NPM_TOKEN` secret. No code change needed.

## Sanity-checking locally

Dry-run to see what version/notes it _would_ cut, without publishing (auth will
fail locally without tokens; that's expected — the commit analysis is still visible
if you skip verification):

```bash
# count releasable commits since the last tag
git log v0.0.3..HEAD --pretty=format:'%s' | grep -cE '^feat([(:].*)?:'
```

---

This document reflects
[`.github/workflows/release.yml`](.github/workflows/release.yml),
[`.releaserc.json`](.releaserc.json), and [`package.json`](package.json). If those
files change, update this doc to match.
