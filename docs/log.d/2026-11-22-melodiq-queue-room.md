## 2026-11-22 — Melodiq song queue as host room state (agent)

- `docs/tech/melodiq-architecture.md` §2.13 (new): queue mirrored into a `melodiq-queue` `useRoomReducer` room (`HOST_QUEUE`), phone requests `queue.add` / `queue.remove` / `queue.toggle_participant` / `queue.reorder_participant` / `queue.select_song` as room events with role checks on the stamped `from`, `helper_config.get` as the direct helper URL request; §2.3 and §2.7 point to it.
- `docs/tech/sync-protocol.md` §4.2: `helper_config.get` and the `room` envelope rows.
- Code outside `docs/` changed (Melodiq queue sync, #817).
