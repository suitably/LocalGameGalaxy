## 2026-11-22 — Imposter party room on a shared sealed peer, phase 4.2 (agent)

- `docs/tech/architecture.md` §3.2: `room-game/sealed/` (`SealedRoomPeer`, `SealChannel`, `sealCrypto.ts`) moved from the tabletop into the shared module; users: tabletop scripted card games, Imposter.
- `docs/tech/game-catalog.md`: Imposter's party-room sync and shared imports.
- `docs/tech/tabletop-scripted-games.md`, `tabletop-engine.md`: the tabletop peer and `PrivateHandChannel` build on the shared sealed module.
- `docs/tasks/GAME-CATALOG-RESTRUCTURE.md`, `docs/tasks/index.md`: 4.2 done, 4.1 (Werewolf) next.
