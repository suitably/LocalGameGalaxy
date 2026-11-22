---
type: Architecture Decision Record
title: 'ADR-0009: End-to-end encrypted MQTT room payloads, key in the invite link'
description: 'Every MQTT mailbox payload of a room or "play over days" game is AES-GCM-256 encrypted with a key the host creates and shares only in the invite link #fragment; only last-state messages are retained; key-less legacy rooms stay plaintext for one release.'
resource: src/modules/sync/roomCrypto.ts
tags: [adr, sync, mqtt, privacy, encryption, party]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Implemented with #662; read src/modules/sync/{MqttMailboxService,roomCrypto,roomKeys}.ts, src/features/party/logic/{partyMailbox,partyRoutes,universalPartyManager}.ts, src/modules/room-game/roomTransport.ts, src/modules/sharing/{sessionLink,useSessionSharing,useGameJoinUrl}.ts, src/components/connection/connectionUrl.ts; unit tests with a fake broker (`src/modules/sync/testing/fakeMqttBroker.ts`)'
sources:
  - 'src/modules/sync/roomCrypto.ts'
  - 'src/modules/sync/roomKeys.ts'
  - 'src/modules/sync/MqttMailboxService.ts'
  - 'docs/tech/sync-protocol.md'
  - 'docs/tech/privacy-notice.md'
---

# ADR-0009: End-to-end encrypted MQTT room payloads, key in the invite link

## Status

Accepted 2026-11-22. Maintainer decision 2026-11-07 on #662 (encrypt every payload end to end with Web Crypto AES-GCM; the host's key travels only in the invite link's `#fragment`; drop `retain` where not needed). The two open points of the issue were decided by best practice and are recorded below (decisions 4 and 5).

## Context

- `MqttMailboxService` sent party rosters, room-game state, drawings and stories as plain (LZ-compressed) JSON to public brokers (`broker.hivemq.com`, `test.mosquitto.org`) with `retain: true` on every message. Anyone who knew or guessed a topic could read it, and the brokers kept the last message per topic.
- Devices join through links and QR codes: the party lobby invite `#/party?room=<CODE>` (`buildPartyShareUrl`, Gartic Phone share dialog, `buildDeviceConnectionUrl` lobby links for Melodiq phones) and the "Play over days" player links of GuessArt and Storyteller (`buildSessionLink`). A URL fragment is never sent to a web server.
- There is no "type a room code" join screen for guests; a code can still be typed into the URL (`/party?room=<CODE>`), and old links and old clients exist.

## Decision

1. **Envelope.** A channel with a room key is published as `{"v":1,"iv":"<base64 12 bytes>","ct":"<base64 AES-GCM-256 ciphertext + tag>"}` (`roomCrypto.ts`). The plaintext inside is the unchanged wire string (mailbox envelope JSON or its `LZ:` compression). Keys are 256-bit random, base64url (43 characters), imported non-extractable. Messages that are not an envelope of a known version, or fail to decrypt, are ignored; a keyed channel ignores plaintext.
2. **Key creation and transport.** The party host creates the key in `createParty` (session storage `galaxy_room_key_<ROOM>`, a reload keeps it); a "Play over days" game gets one at creation or when it is shared (local storage `galaxy_room_key_<gameId>`, the game spans days). Every invite link carries it as `key=` inside the fragment; `captureInviteKey()` stores it on the joining device and reads the key only from the fragment, never from the query string. Push / ntfy deep links carry no key (they pass third-party servers; the device already has the key).
3. **Scope.** All five mailboxes use it: `lgg/party` (`party_<room>`), `lgg/room` (the room of `getRoomTransport(roomId)`), `lgg/tabletop` (room code), `lgg/ga` and `lgg/storyteller/v1` (game id).
4. **Old clients without a key (open point 1): one-release transition.** A room whose invite has no key (old link, old host) keeps working unencrypted for old and new clients. New rooms and new games are always encrypted, and an encrypted payload is never readable without the key. **Plaintext support is removed in a later release** (follow-up issue): then a channel without a key stops publishing and receiving instead of falling back.
5. **`retain` (open point 2).** Retained only where a late joiner needs the last state, and then encrypted: party room state, room-game `{kind: 'state'}`, GuessArt and Storyteller snapshots (a short QR link loads the game from it). Not retained: presence pings, room `hello` / `action`, every `_live` event, all tabletop traffic (a seat asks the host for a snapshot).
6. **Typed room code.** A device that joins an encrypted room without the key (typed code, link without `key=`) cannot read or write it; when it hears an encrypted message on the party channel the lobby shows a hint (`PartyEncryptedRoomNotice`, `party.encrypted_room_hint`) to open the host's invite link or scan the QR code. The host shares the key only via link / QR; the room code alone is not a credential.

## Alternatives considered

- **Key derived from the room code** (e.g. PBKDF2 of the code): no link change, but six-character codes are guessable, so it would hide nothing from someone scanning topics. Rejected.
- **Encryption only on the companion server or a private broker**: needs infrastructure, does not cover the public-broker default. Rejected.
- **Hard cut without transition**: breaks running rooms and every old link the day the release ships. Rejected in favour of one transition release.
- **Key in local storage for party rooms**: would let the key outlive the party; session storage matches the host role (`PARTY_HOST_ID` is session-scoped too).

## Consequences

**Positive**: brokers see only ciphertext, topic names, timing and IP addresses; retained data shrinks to one encrypted last state per topic; no new dependency (Web Crypto).

**Negative**: invite links are 48 characters longer; a device that lost the link (new tab of a guest, cleared storage) must open it again; "Play over days" games created before this release get a key when shared again, so guests holding an old link need a fresh one; topic names (room code, game id) and message timing stay visible; legacy plaintext rooms stay readable until the follow-up release.

**Follow-up**: remove the plaintext fallback (decision 4) in a later release; consider hashing topic names so room codes are not visible to brokers.
