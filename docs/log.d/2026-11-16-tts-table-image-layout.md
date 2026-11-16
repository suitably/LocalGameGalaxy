## 2026-11-16 — TTS import: custom table image and layout (claude-code)

- `docs/tech/tabletop-engine.md`: described the TTS import layout from `logic/ttsParser.ts`, `ttsFidelity.ts`, `ttsContainers.ts` and `components/widgets/TokenWidgetView.tsx`: +Z at the top, pieces centred on their position, custom table image as board `tts_table`, card and block sizes from the object scale, rotation from `rotY + 180`, front-face crop of model textures, quarter-turned fog zones. Table extent and card size are marked unverified (fitted to one mod).
