---
type: Reference
title: 'Licensing and dependency licences'
description: 'How the repository stays REUSE-compliant under AGPL-3.0-or-later, which files are third-party and under which licence, the production-dependency licence allow-list (scripts/check-licences.mjs), the THIRD_PARTY_LICENSES.txt in server archives, and the in-app source-code link.'
tags: [licensing, agpl, reuse, dependencies, compliance]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'ran reuse 6.3.0 lint; compared android/ with node_modules/@capacitor/cli/assets/android-template.tar.gz; read the licence files of dictionary-de, dictionary-en, gradle-wrapper.jar META-INF/LICENSE and the lockfile licence fields of root, server/ and signaling/'
sources:
  - 'REUSE.toml'
  - 'LICENSES/'
  - 'scripts/check-licences.mjs'
  - 'scripts/lib/licences.mjs'
  - '.github/workflows/ci.yml'
  - '.github/workflows/release.yml'
  - 'src/features/settings/components/SourceCodeLink.tsx'
---

# Licensing and dependency licences

The project (web app, Android app, companion server, signaling tracker) is `AGPL-3.0-or-later` since 2026-10-26 ([LICENSE](../../LICENSE), README §8). This page lists what is not our own work and the checks that keep it that way (#594).

## 1. REUSE compliance

Every file has licence and copyright information per [REUSE 3.3](https://reuse.software/spec-3.3/). There are no per-file headers; [`REUSE.toml`](../../REUSE.toml) annotates paths and [`LICENSES/`](../../LICENSES/) holds each licence text.

| Files                                                                                                                                                                                                                                                                              | Holder                                                        | Licence                        | Evidence                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| everything else (own code, docs, brand assets, PWA/Android icons, `public/games/tabletop/*.json`)                                                                                                                                                                                  | `LocalGameGalaxy` (wording open: [Q25](../open-questions.md)) | `AGPL-3.0-or-later`            | LICENSE, `license` in all three `package.json`                                                           |
| unchanged Capacitor Android template files and the `cap sync` outputs (`android/build.gradle`, `settings.gradle`, `variables.gradle`, `capacitor.*.gradle`, `gradle-wrapper.properties`, `app/proguard-rules.pro`, the two `Example*Test.java`, default launcher/layout/style XML) | 2017-present Drifty Co.                                       | `MIT`                          | byte-identical to `node_modules/@capacitor/cli/assets/android-template.tar.gz`; `@capacitor/cli` LICENSE |
| template files changed for this app (`android/.gitignore`, `gradle.properties`, `app/build.gradle`, `AndroidManifest.xml`, `MainActivity.java`, `values/strings.xml`, `values/ic_launcher_background.xml`)                                                                         | Drifty Co. and LocalGameGalaxy                                | `MIT AND AGPL-3.0-or-later`    | same template, file differs                                                                              |
| `android/gradlew`, `android/gradlew.bat`                                                                                                                                                                                                                                           | the original authors (Gradle)                                 | `Apache-2.0`                   | own SPDX headers in the files                                                                            |
| `android/gradle/wrapper/gradle-wrapper.jar`                                                                                                                                                                                                                                        | the original author or authors (Gradle)                       | `Apache-2.0`                   | `META-INF/LICENSE` in the jar                                                                            |
| `src/games/wordle/data/words-de.ts`                                                                                                                                                                                                                                                | 1999-2016 Björn Jacke (igerman98)                             | `GPL-2.0-only OR GPL-3.0-only` | `node_modules/dictionary-de/license`                                                                     |
| `src/games/wordle/data/words-en.ts`                                                                                                                                                                                                                                                | 2000-2018 Kevin Atkinson and the SCOWL contributors           | `LicenseRef-SCOWL`             | `node_modules/dictionary-en/license` (copied to `LICENSES/LicenseRef-SCOWL.txt`)                         |

The Android launcher and splash PNGs differ from the template's, so they are the app's own images. Fonts (`@fontsource-variable/*`, `OFL-1.1`) and icons (`@mui/icons-material`, MIT) come from npm, not from files in the repository. Workshop games are loaded at runtime and never stored here (Q21).

A new third-party file needs an override entry in `REUSE.toml` (and its licence via `reuse download <id>`); otherwise it inherits the AGPL default silently.

## 2. Dependency licence allow-list

`npm run check:licences` ([`scripts/check-licences.mjs`](../../scripts/check-licences.mjs)) reads the production entries (not `dev`) of `package-lock.json`, `server/package-lock.json` and `signaling/package-lock.json` and fails when a licence is missing or not on the allow-list. No install is needed.

- **Allow-list** ([`scripts/lib/licences.mjs`](../../scripts/lib/licences.mjs) `ALLOWED_LICENCES`): MIT, ISC, BSD-2/3-Clause, 0BSD, Apache-2.0, MPL-2.0, CC0-1.0, CC-BY-4.0, Unlicense, Python-2.0, BlueOak-1.0.0, LGPL-2.x/3.0, GPL-2.0-or-later, GPL-3.0, AGPL-3.0, plus, each with a reason: `Zlib` (pako), `WTFPL` (server: `truncate-utf8-bytes`), `OFL-1.1` (the two variable fonts). An `OR` expression passes when one side is allowed, `AND` needs all.
- **Aliases and overrides**: `MPL 2.0` → `MPL-2.0` (node-datachannel). Packages without a usable lockfile licence are pinned by `name@version` in `LICENCE_OVERRIDES` after reading the package: `fuzzy@0.1.3`, `khroma@2.1.0`, `compact2string@1.4.1` (metadata says `BSD`, README says MIT). A new version fails until someone checks it again.
- **Not allowed** (would fail): e.g. `GPL-2.0-only`, `SSPL-1.0`, `BUSL-1.1`, bare `BSD`. Add a licence only if it is compatible with AGPL-3.0-or-later; otherwise raise an open question.
- Status 2026-11-22: root 512, server 38, signaling 81 production packages, all allowed.

Tests: `scripts/lib/licences.test.mjs` (`node --test`, part of `npm run test:scripts`).

## 3. Where it runs

- **CI** (`ci.yml`, job "Deterministic Prechecks (no install)"): `fsfe/reuse-action` v6.0.0 (SHA-pinned) runs `reuse lint`; `npm run check:licences` follows. Both need no `npm ci`. GitLab runs the licence check through `npm run ci:gates` (no `reuse lint` there).
- **Release** (`release.yml`): the gates job runs `check:licences`; the server-binary job writes `THIRD_PARTY_LICENSES.txt` with `node scripts/check-licences.mjs --notice server --out …` (licence files from `server/node_modules/<pkg>/LICENSE*`) and copies it with `LICENSE` into every server archive. The CycloneDX SBOMs (#592, [ci-cd-pipelines](../workflows/ci-cd-pipelines.md)) list the same packages.
- Locally: `pipx run reuse lint` (or `pip install reuse`).

## 4. Source code offer (AGPL §13)

Settings → About shows a "Source code" section ([`SourceCodeLink.tsx`](../../src/features/settings/components/SourceCodeLink.tsx), keys `settings.source_*`) with the licence name and a link to `https://github.com/suitably/LocalGameGalaxy`. Forks that run a changed version for others must point it at their own source.
