---
type: Reference
title: 'External sources and upstream projects'
description: 'Links to the specifications, frameworks, public infrastructure and server-side tools LocalGameGalaxy depends on, with the exact place in the code that uses each one.'
tags: [references, upstream, okf, infrastructure]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-24
  method: 'versions from package.json / server/package.json; URLs and call sites grepped in code'
sources:
  - 'package.json, server/package.json, signaling/package.json'
---

# External sources

## OKF

Open Knowledge Format, v0.2 — format of this bundle. One concept per markdown file, YAML front matter (`type` required; `title`, `description`, `tags`, `status`, `generated`, `verified`, `sources` recommended), only the root `index.md` carries `okf_version`, directory `index.md` files for progressive disclosure, `log.md` newest-first.
Spec summary: <https://specification.website/spec/agent-readiness/okf-bundle/>

## Frontend stack

| Project                                                                          | Version (package.json) | Used for                                    |
| -------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------- |
| [React](https://react.dev/)                                                      | 19.3                   | UI                                          |
| [Vite](https://vite.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | 7.3 / 2.0              | build, PWA service worker                   |
| [MUI](https://mui.com/)                                                          | 7.3                    | components, theme                           |
| [Dexie](https://dexie.org/)                                                      | 4.4                    | `MelodiqDB`, `MelodiqNotesDB`, `ImposterDB` |
| [i18next](https://www.i18next.com/) / react-i18next                              | 25 / 16                | translations                                |
| [Capacitor](https://capacitorjs.com/docs)                                        | 8.5                    | Android app (`android/`)                    |
| [Excalidraw](https://docs.excalidraw.com/)                                       | 0.18                   | `src/modules/drawing`                       |
| [Vitest](https://vitest.dev/)                                                    | 5                      | frontend tests                              |

## Sync infrastructure (public, third-party)

| Service                                                                                                               | Where in code                                                                     |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| MQTT over WSS: `wss://broker.hivemq.com:8884/mqtt`, `wss://broker.emqx.io:8084/mqtt`                                  | `DEFAULT_BROKER_URLS` in `src/modules/sync/MqttMailboxService.ts`                 |
| WebTorrent trackers: `wss://tracker.openwebtorrent.com`, `wss://tracker.btorrent.xyz`, `wss://tracker.webtorrent.dev` | `src/lib/webrtc/WebRTCHostContext.tsx`, `src/games/melodiq/PhoneClientEngine.tsx` |
| [ntfy](https://docs.ntfy.sh/) (default `https://ntfy.sh`)                                                             | `storage.getNtfyServerUrl()`, `src/lib/push/pushClient.ts`                        |
| Web Push (RFC 8291 / 8292) via Cloudflare Worker                                                                      | `server/cloudflare-push-relay/worker.ts`, `webpush.ts`                            |

These are public services without an SLA. Game state sent over MQTT is readable by anyone who knows the topic (**Inference** from the code: no payload encryption beyond LZString compression).

## Companion server and signaling

| Project                                                                                                            | Used for                                                                 |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [Hono](https://hono.dev/) + `@hono/node-server`                                                                    | `server/src/core/app.ts`, plugin server                                  |
| [bittorrent-tracker](https://github.com/webtorrent/bittorrent-tracker)                                             | `signaling/src/index.js` (port 8000, `/health`)                          |
| [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) Quick Tunnel         | `server/src/core/tunnel.ts`, `ENABLE_TUNNEL` / `--tunnel`                |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp)                                                                         | `server/src/plugins/melodiq/services/download.ts`                        |
| [USDB](https://usdb.animux.de/) (UltraStar song DB)                                                                | `server/src/plugins/melodiq/services/usdb.ts`                            |
| [python-audio-separator](https://github.com/nomadkaraoke/python-audio-separator) with `UVR-MDX-NET-Inst_HQ_3.onnx` | `server/src/plugins/melodiq/services/separator.ts`                       |
| [whisper-timestamped](https://github.com/linto-ai/whisper-timestamped)                                             | `server/src/scripts/align_lyrics.py`                                     |
| [esbuild](https://esbuild.github.io/) + [@yao-pkg/pkg](https://github.com/yao-pkg/pkg)                             | `server/package.json` scripts `bundle` / `package` (standalone binaries) |

## Hosting and CI

| Service                                                                                                                             | Where                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Cloudflare Workers static assets (`nexumia`)                                                                                        | `wrangler.jsonc`, `ci.yml` job `deploy-cloudflare`          |
| Docker Hub `nexumia/nexumia-server` (targets `base`, `full`) and deprecated alias `nexumia/melodiq-server`                          | `docker-publish.yml`                                        |
| Docker Hub `nexumia/galaxy-signaling` (consumed by compose files; published by `docker-publish.yml` job `build-and-push-signaling`) | `server/docker-compose.yml`, `signaling/docker-compose.yml` |
| GitLab mirror `Xilance/localgamegalaxy` (SAST, secret detection)                                                                    | `.gitlab-ci.yml`                                            |
