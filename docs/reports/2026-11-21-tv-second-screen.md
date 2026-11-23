---
type: Report
title: 'TV second screen: why Android Chrome cannot cast, and the host-phone + TV table flow'
description: 'Why the Presentation API cast fails on Chrome for Android and in the Capacitor app, and the URL/QR second-screen flow that lets a host phone play its own hand while a TV shows the Spieltisch.'
tags: [tv, second-screen, presentation-api, chromecast, android, tabletop, melodiq]
status: stable
generated:
  at: 2026-11-21T19:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-21
  method: 'Code read with grep (useTVMode.ts, useTVReceiver.ts, TVModeButton.tsx, TabletopGame.tsx, partyRoutes.ts); platform facts from the W3C Second Screen implementation status, the Chromium 1-UA intent-to-ship thread and MDN. developer.chrome.com was not reachable from the session, so the 2026 Android status is not re-checked.'
sources:
  - 'src/lib/secondScreen.ts'
  - 'src/components/common/ShowOnTvDialog.tsx'
  - 'src/games/melodiq/hooks/useTVMode.ts'
  - 'src/games/melodiq/components/TVModeButton.tsx'
  - 'src/games/tabletop/TabletopGame.tsx'
---

# TV second screen (2026-11-21)

## 1. Why Android Chrome cannot "stream to the TV"

- The only cast path in the app was Melodiq's `new PresentationRequest(['/games/melodiq/tv']).start()` (`src/games/melodiq/hooks/useTVMode.ts`). It presents a normal web page.
- **Chrome on Android** implements the Presentation API controller only for Cast/DIAL **receiver apps** (2-UA mode). Presenting an arbitrary https page (1-UA mode, offscreen tab streamed to a Chromecast) shipped on desktop only; on Android the page sees "no device available" ([W3C implementation status](https://www.w3.org/wiki/Second_Screen/Implementation_Status), [Chromium 1-UA intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/HZ_ZHEE9oDo)).
- **Android WebView (Capacitor app)** has no Presentation API at all ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/presentation), crbug 521319). The app origin `https://localhost` is also unreachable for any TV.
- Android Chrome has **no "Cast tab"**; only whole-screen mirroring (Quick Settings "Cast" / Samsung Smart View / Google Home "Cast my screen"). Mirroring shows the phone's private cards, so it is unusable for card games.
- Melodiq's fallback `window.open('/games/melodiq/tv')` talks over BroadcastChannel only, i.e. the same device: on a phone it just opens a tab.
- The Melodiq button showed "Cast" whenever `PresentationRequest` existed and logged `start()` failures to the console only, so on Android it silently did nothing.

Not viable: Remote Playback API (one `<video>`/`<audio>` element only), `getDisplayMedia` (capture, not output). A Cast SDK custom receiver would need a registered app ID, a public https receiver and a native Capacitor plugin, and does not work offline.

## 2. Chosen flow: the TV opens a URL and joins as a read-only client

- `src/lib/secondScreen.ts`: `buildScreenUrl` (page origin; the hosted `PUBLIC_APP_URL` in the native app), `canTryPresentation` (Presentation API only on non-Android, non-native browsers), `presentOnScreen`.
- `src/components/common/ShowOnTvDialog.tsx`: option list from `screenOptions` (Cast where the Presentation API can work; "Open in a separate window" on desktop for a laptop/PC on the TV; "Send link" via the share sheet on phones; "Mirror this screen" only when the device shows nothing private, `mirrorSafe`), plus QR code + URL for the TV browser. Opened from the game's header menu, never from a button in the page body (update 2026-11-22).
- Spieltisch: the TV opens `/games/tabletop?room=…&gameId=…&role=screen` and syncs like a seatless spectator, so it receives only public data. The host phone stays the state owner and can play its own seat (`role=tv&seat=N`). Details: [`docs/tech/tabletop-engine.md`](../tech/tabletop-engine.md).
- Melodiq: the Cast option is hidden where it cannot work and failures are shown. Giving `/games/melodiq/tv` a network transport (so a TV browser can join) is open work.

## 3. Limits

- The TV needs the same network transport as the phones (MQTT broker / companion server). Fully offline LAN play without a reachable broker needs the companion server.
- The host phone must stay awake; it owns the table state.
