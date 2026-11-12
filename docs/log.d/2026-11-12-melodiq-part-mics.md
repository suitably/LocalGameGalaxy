## 2026-11-12 — Melodiq part mics in the phone lyrics (claude-code)

- `docs/tech/melodiq-architecture.md` §2.6: phones pick their duet part with lane-coloured mics in the lyrics (`LyricsPartContext`, `PartMicButton`), spectators join with them (`useHostPhoneJoin`, `addJoiningPhone`), `songInfo` carries `singing`; the host's part switch is limited to local-mic singers. Outside `docs/`: `PhoneTrackPicker` / `PhoneTrackChoiceOverlay` removed, locale keys `sing_part`, `singing_part`, `solo_part` replace `duet_part`.
