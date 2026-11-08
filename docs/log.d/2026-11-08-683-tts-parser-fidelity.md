## 2026-11-08 — TTS parser fidelity, #683 (claude-code)

- `docs/tech/tabletop-engine.md` (import section): unique ids on GUID repeats, face/rotation from `rotZ`/`rotY`, `3DText` labels, `scriptZones`, dense seats, all `TabStates`, `Note`-only description, `labelKey` names, hex snaps from tile shape.
- Outside `docs/`: `logic/ttsFidelity.ts`, `ttsParser.ts`, `ttsContainers.ts`, `ScriptZone` in `types.ts`/`gameValidator.ts`, label keys in `public/locales`, test `logic/__tests__/ttsFidelity.test.ts`.
