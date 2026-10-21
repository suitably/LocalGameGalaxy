---
okf_version: '0.2'
type: Index
title: 'LocalGameGalaxy (Nexumia) Knowledge Base'
description: 'Everything an agent or developer needs to work on LocalGameGalaxy: the React/Vite PWA game hub (15 games), shared modules, sync and persistence layers, the optional Hono companion server, CI/CD, operations, decisions, open questions and dated audits.'
tags: [localgamegalaxy, nexumia, react, vite, pwa, capacitor, hono, knowledge-base]
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
---

# LocalGameGalaxy Knowledge Base

This bundle describes **one code base**: the GitHub repository `suitably/LocalGameGalaxy` (mirrored to GitLab `Xilance/localgamegalaxy`). The product is branded **Nexumia** (Capacitor `appName`, Android package `com.localgamegalaxy.melodiq`, web host `nexumia.de`). It is an offline-first React 19 / Vite 7 PWA that bundles 15 local party, dice, card, drawing and music games, plus an optional Node/Hono companion server (`server/`) and a standalone BitTorrent signaling tracker (`signaling/`).

**Agents: read [AGENTS.md](../AGENTS.md) first.** It has the code rules, the verification gates and the rules for keeping this bundle correct.

## Where to find what

| You want to…                                                                 | Go to                                                                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Understand the overall system, folders and module boundaries                 | [tech/architecture.md](tech/architecture.md)                                                                           |
| **See every game: route, folder, storage, sync, i18n, tests**                | [tech/game-catalog.md](tech/game-catalog.md)                                                                           |
| Know the coding rules, size budget, anti-pattern matrix                      | [tech/coding-conventions.md](tech/coding-conventions.md)                                                               |
| Sync devices (MQTT mailbox, BroadcastChannel, WebRTC, Web Push)              | [tech/sync-protocol.md](tech/sync-protocol.md)                                                                         |
| WebRTC signaling, BitTorrent tracker, reconnect logic                        | [tech/webrtc-signaling.md](tech/webrtc-signaling.md)                                                                   |
| Store data (`storage.ts`, `STORAGE_KEYS`, IndexedDB databases, server files) | [tech/persistence.md](tech/persistence.md)                                                                             |
| Find the real TypeScript types for registry, sync, songs, tabletop           | [tech/data-models.md](tech/data-models.md)                                                                             |
| Add or change UI strings (de/en, per-game bundles)                           | [tech/i18n-strategy.md](tech/i18n-strategy.md)                                                                         |
| Theme, safe areas, Capacitor touch CSS                                       | [tech/styling.md](tech/styling.md)                                                                                     |
| Write or run tests (Vitest, `node --test`)                                   | [tech/testing-guide.md](tech/testing-guide.md)                                                                         |
| Melodiq karaoke internals (host, TV, phone client, stems)                    | [tech/melodiq-architecture.md](tech/melodiq-architecture.md)                                                           |
| Song download, vocal separation, lyric alignment on the server               | [tech/song-pipeline.md](tech/song-pipeline.md)                                                                         |
| Werewolf / Qwixx game rules and engines                                      | [tech/werewolf-architecture.md](tech/werewolf-architecture.md), [tech/qwixx-sheet-rules.md](tech/qwixx-sheet-rules.md) |
| Companion server auth, API keys, CORS, PNA                                   | [tech/server-security.md](tech/server-security.md)                                                                     |
| Server `config.json`, tokens, HTTPS for phones                               | [tech/secrets-management.md](tech/secrets-management.md)                                                               |
| Hosting, Docker images, Android APK, server binaries                         | [tech/deployment.md](tech/deployment.md)                                                                               |
| Local dev setup problems                                                     | [tech/onboarding-faq.md](tech/onboarding-faq.md)                                                                       |
| CI workflows, release pipeline, secrets, branch protection                   | [workflows/ci-cd-pipelines.md](workflows/ci-cd-pipelines.md)                                                           |
| Run the server via Docker Compose locally                                    | [workflows/dev-compose-workflow.md](workflows/dev-compose-workflow.md)                                                 |
| Operate the server, rotate tokens, release Android, troubleshoot             | [operations/index.md](operations/index.md)                                                                             |
| Why Dexie, BitTorrent signaling, Capacitor, audio-separator                  | [adr/index.md](adr/index.md)                                                                                           |
| Open, agent-ready refactoring tasks                                          | [tasks/index.md](tasks/index.md)                                                                                       |
| **Known contradictions, broken things, decisions pending**                   | [open-questions.md](open-questions.md)                                                                                 |
| Dated audits and evaluations                                                 | [reports/index.md](reports/index.md)                                                                                   |
| What changed in this bundle                                                  | [log.md](log.md)                                                                                                       |
| Upstream projects and specs                                                  | [references/index.md](references/index.md)                                                                             |
| Finished task specs and retired tooling                                      | [archive/index.md](archive/index.md)                                                                                   |

## Never do this (summary — details in [AGENTS.md](../AGENTS.md))

1. **No cross-game imports** (`src/games/<A>` → `src/games/<B>`). Shared code goes to `src/modules/`, `src/components/` or `src/lib/`.
2. **No raw `localStorage` / `sessionStorage`.** Use `storage` / `sessionStorageSafe` from `src/lib/storage.ts` with a key registered in `STORAGE_KEYS`.
3. **No `window.confirm` / `prompt` / `alert`.** Use `ConfirmDialog` or MUI `<Dialog>`.
4. **Never grow a component listed in `scripts/legacy-component-baselines.json`**, and never create a new `.tsx` file over 250 lines.
5. **Never commit songs, stems or other media** under `server/music/`.
6. **Never push to `main` directly** — it is protected; work goes through PRs.

## Sections

- [Technical architecture](tech/index.md) — how the code works _right now_. One topic, one file.
- [Workflows](workflows/index.md) — CI/CD, local compose, SOLID workflow.
- [Operations](operations/index.md) — runbooks for server, tracker, Android release, incidents.
- [ADRs](adr/index.md) — accepted architecture decisions.
- [Tasks](tasks/index.md) — open task specs that mirror GitHub issues.
- [Reports](reports/index.md) — dated snapshots; facts there may be stale by design.
- [References](references/index.md) — external sources.
- [Archive](archive/index.md) — completed or deprecated documents kept for history.
