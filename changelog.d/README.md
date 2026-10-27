# Changelog fragments

Every user-facing PR adds one file here instead of editing `CHANGELOG.md`, so parallel PRs never conflict (#593).

- **Name:** `<slug>.<type>.md`, slug in lowercase (`a-z`, `0-9`, `-`, `.`, `_`), best the issue number plus a word or two: `592-supply-chain-hardening.added.md`.
- **Type** (heading in `CHANGELOG.md`, version bump): `added` (Added, minor), `changed` (Changed, minor), `deprecated` (Deprecated, minor), `removed` (Removed, minor), `fixed` (Fixed, patch), `security` (Security, patch).
- **Content:** one or more Markdown bullets in the `CHANGELOG.md` style, no headings. Text without a leading `- ` becomes one bullet.

```md
- **Tabletop: shuffle animation** (#556): a shuffled deck briefly riffles its two halves …
```

`npm run check:changelog` validates the files (CI precheck). The release workflow (`.github/workflows/changelog-release.yml`) collects them into a `## [X.Y.Z]` section and deletes them. Flow and commands: [docs/workflows/ci-cd-pipelines.md](../docs/workflows/ci-cd-pipelines.md#26-changelog-release-pr--tag-changelog-releaseyml).
