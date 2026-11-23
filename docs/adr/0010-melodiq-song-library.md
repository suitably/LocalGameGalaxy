---
type: Architecture Decision Record
title: 'ADR-0010: Melodiq song library with artists, albums, favourites and playlists per API user'
description: 'Melodiq replaces the plain song search with a library (All / Artists / Albums / Favourites / Playlists); favourites and playlists live per API user on the companion server, shared playlists are read-only for others, and on the device when a local folder is used.'
resource: src/games/melodiq/logic/songLibraryStore.ts
tags: [adr, melodiq, server, playlists, favourites, library]
status: stable
generated:
  at: 2026-11-22T12:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Written with the implementation of #636; read server/src/core/auth.ts (getRequester), server/src/plugins/melodiq/{routes,services}/songLibrary.ts, src/games/melodiq/logic/songLibrary*.ts, src/games/melodiq/hooks/SongLibraryProvider.tsx'
sources:
  - 'server/src/plugins/melodiq/services/songLibrary.ts'
  - 'server/src/plugins/melodiq/routes/songLibrary.ts'
  - 'src/games/melodiq/logic/songLibrary.ts'
  - 'src/games/melodiq/logic/songLibraryStore.ts'
  - 'docs/tech/melodiq-architecture.md'
---

# ADR-0010: Melodiq song library with artists, albums, favourites and playlists per API user

## Status

Accepted 2026-11-22. Maintainer decision 2026-11-07 on issue #636 (full library UI; favourites and playlists per API user on the companion, shareable, and on the device with a local folder). The two open points below were decided by best practice.

## Context

- Melodiq's song list was a search field with genre/edition filters. Playlists existed, but the companion kept one shared `playlists.json` in which each entry stored the **raw API token** of its creator, and `GET /api/playlists` returned those tokens to every user. Any user could overwrite any playlist with `POST`.
- The companion already models users as API keys: `getRequester(c)` (`server/src/core/auth.ts`) gives the key id and name, or `master`; tabletop saves own records the same way.

## Decision

1. **Library UI.** Tabs All / Artists / Albums / Favourites / Playlists under the search bar; artists and albums are accordions, every song row has a favourite heart, playlists reuse the existing playlist screens ([melodiq-architecture §2.12](../tech/melodiq-architecture.md)).
2. **One store interface, two implementations** (`SongLibraryStore`): the companion store when the companion is active and no local folder is used, else the local store (favourites in `storage.ts`, playlists in the existing Dexie `playlists` table, so device playlists survive).
3. **Per-user server storage.** `melodiq-library.json` next to the config holds favourites per owner id and playlists with `ownerId`, `ownerName`, `shared`. Owner = `getRequester(c).id`; no token is stored or returned. Routes under `/api/melodiq/library/*` ([song-pipeline §3](../tech/song-pipeline.md#3-library-and-media-endpoints)).
4. **Open point 1 — shared playlists: owner edits, others read-only.** A `shared` playlist is listed for every API user with `mine: false` and `ownerName`; `PUT` by others answers `403`. Private playlists answer `404` to others (their existence is not revealed). Deleting is allowed for the owner and, for moderation, the master token / management keys.
5. **Open point 2 — album source.** UltraStar `#ALBUM` (server scanner and local folder scan), else `album` in `song.json`; empty is grouped as "Unknown album" (sorted last, like "Unknown artist").
6. **Migration.** On first load without `melodiq-library.json`, a legacy `playlists.json` is imported once: the creator token is resolved to its API key id (unknown or master token → `master`), the token is dropped, and the lists become `shared` because they were visible to everyone before. The legacy file is left untouched. The old `/api/playlists*` routes and the client's playlist auto-sync toggle are removed (no aliases, as with #568).

## Consequences

- Playlists of other users can no longer be changed or deleted by non-owners; tokens no longer leak through the playlist API.
- Older app versions that still call `/api/playlists` get `404`; their playlist sync fails silently, nothing else breaks.
- Device playlists and companion playlists are separate: switching between a local folder and the companion shows the other store's lists (no merge). A song in a favourite or playlist that is missing from the current library is skipped in the views.
- Favourites are per API user; several people sharing one API key share favourites.
