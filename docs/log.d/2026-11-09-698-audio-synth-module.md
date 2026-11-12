## 2026-11-09 — audio: synth, soundfont, sound settings and MIDI input moved to `src/modules/audio/synth` (#698) (agent)

- `docs/tech/architecture.md` §3.2 (`audio` row): `synth/` and `scheduleBeep`.
- `docs/tech/melodiq-notes-architecture.md` §1: shared audio code, `BrowserStageSound` keeps its own context.
- `docs/tech/privacy-notice.md`: path of `soundSettings.ts`.
- Outside `docs/`: moved files, `getSharedAudioContext`, Melodiq calibrators use `scheduleBeep`.
