---
type: Reference
title: 'Privacy notice'
description: 'Where the public privacy notice lives (public/datenschutz.html, public/privacy.html), which data flows it describes and the rule that every new external service updates it in the same PR.'
tags: [privacy, gdpr, legal, third-party]
status: stable
generated:
  at: 2026-11-06T21:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'read wrangler.jsonc, cloudflare/worker.ts, src/modules/sync/MqttMailboxService.ts, src/modules/sync/roomCrypto.ts, src/modules/sync/roomKeys.ts, src/lib/push/, src/games/melodiq/gameplay/youtubeApi.ts, src/modules/audio/synth/soundSettings.ts, src/modules/audio/MicrophoneManager.ts, @excalidraw/excalidraw dist (esm.sh default), docs/tech/webrtc-signaling.md §6, docs/references/external-sources.md'
sources:
  - 'public/datenschutz.html'
  - 'public/privacy.html'
---

# Privacy notice

The privacy notice is two static pages served from the build: `public/datenschutz.html` (German) and `public/privacy.html` (English), styled by `public/legal.css`. Settings → About links to the one matching the UI language (`src/features/settings/components/PrivacyNoticeLink.tsx`, path from `src/features/settings/privacyNotice.ts`). They ship in the Android app as well.

## Rule

**A PR that adds, removes or changes an external service the client or the Cloudflare Worker contacts updates both pages in the same PR**, and the "Last updated" date. External services are listed in [references/external-sources.md](../references/external-sources.md).

## Data flows the notice covers

| Section | Flow                                                                                                                                                                                                                                                                                                                                                                                                                                        | Code                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2       | Hosting on Cloudflare Workers static assets; no Workers logs configured in `wrangler.jsonc`                                                                                                                                                                                                                                                                                                                                                 | `wrangler.jsonc`                                                                                                                         |
| 3       | Local storage, IndexedDB, service worker cache; microphone analysed on the device (no `addTrack`, no upload)                                                                                                                                                                                                                                                                                                                                | `src/lib/storage.ts`, `src/modules/audio/MicrophoneManager.ts`                                                                           |
| 4.1     | MQTT mailbox on `broker.hivemq.com`, fallback `test.mosquitto.org` (EU, #645); payloads end-to-end encrypted (AES-GCM, key only in the invite link `#fragment`, #662, [ADR 0009](../adr/0009-mqtt-end-to-end-encryption.md)); only the last state retained, encrypted; legacy rooms without a key stay plaintext for one release                                                                                                            | `DEFAULT_BROKER_URLS` in `src/modules/sync/MqttMailboxService.ts`                                                                        |
| 4.2     | WebTorrent trackers and STUN servers (Cloudflare, Twilio) for Melodiq WebRTC                                                                                                                                                                                                                                                                                                                                                                | [webrtc-signaling.md](webrtc-signaling.md) §5–6                                                                                          |
| 4.3     | Draw pot (Lostopf): pot title, note, entries, settings and per draw the drawn entry, time and device id stored in a Cloudflare Durable Object; admin key only as SHA-256; deleted after 60 days (alarm) or by the host; pots on the user's own Nexumia server stay there (section 7)                                                                                                                                                        | `cloudflare/drawPot/`, `server/src/plugins/drawpot/`                                                                                     |
| 5       | Web Push through `/api/push/*` (stateless) and the browser's push service; ntfy (`https://ntfy.sh` default) when chosen                                                                                                                                                                                                                                                                                                                     | `cloudflare/webPushSend.ts`, `src/lib/push/pushClient.ts`                                                                                |
| 6       | YouTube IFrame API (`youtube.com`, `youtube-nocookie.com`) only after the player allowed it (dialog before the first song with a YouTube background, toggle in the Melodiq game settings; `MELODIQ_YOUTUBE_CONSENT` = `granted`/`denied`), soundfonts from `gleitz.github.io` only when chosen (default: built-in synth), Steam Workshop. Excalidraw fonts are served from our host (`public/excalidraw/fonts`, copied by `vite.config.ts`) | `src/games/melodiq/gameplay/youtubeConsent.ts`, `DEFAULT_SOUND_CONFIG`, `src/modules/drawing/ExcalidrawLazy.tsx`, `cloudflare/worker.ts` |
| 7       | Services the user configures: companion server, own tracker/STUN/ntfy, USDB, GitHub PAT for feedback                                                                                                                                                                                                                                                                                                                                        | `src/lib/github.ts`, `src/components/connection/`                                                                                        |

## Open points

- The controller is named as "Nexumia" with the contact `support@nexumia.de`; at the owner's decision (2026-11-06) the pages give no personal name and no postal address, although Art. 13(1)(a) GDPR asks for the controller's identity.
- `test.mosquitto.org` is a test server without SLA; its hosting in France is **Unverified** (third-party report, OVH Roubaix).
- Plaintext rooms (old invite links without `key=`) remain readable by anyone with the topic until the transition release removes them ([ADR 0009](../adr/0009-mqtt-end-to-end-encryption.md)). Brokers still see topic names (room code / game id), timing and IP addresses.
