# TTS compatibility harness [ID: SCRIPTS-TTS-COMPAT]

Dev-only Node tool (TTS plan slice 0, #682, [plan §2](../../docs/reports/2026-11-08-tts-compatibility-plan.md)). Measures how far each Tabletop Simulator Workshop mod gets through the Spieltisch importer, so every later import slice is gated on numbers.

## Run

```bash
npm ci
node scripts/tts-compat/run.mjs --fixture                       # offline, hand-made save
node scripts/tts-compat/run.mjs --out report.json               # corpus.json ids (needs Steam)
node scripts/tts-compat/run.mjs --out after.json --baseline before.json   # exit 1 if a tier dropped
```

Flags: `--ids a,b` (override corpus), `--offline` (cache only), `--check-images` (HEAD up to 3 URLs per image host), `--top N`.
Unit tests (offline, need `npm ci`): `npm run test:tts-compat` (part of `ci:gates`; not in `test:scripts`, which runs without install).

## Rules

- `corpus.json` holds Workshop ids only. Saves go to `scripts/tts-compat/.cache/` (git-ignored); never commit a save or the raw report of a corpus (Q21). Summarise in a dated `docs/reports/` file.
- The real importer (`src/games/tabletop/logic/ttsParser.ts`, `steamWorkshopApi.ts`) is bundled with esbuild at run time — no copy of its logic.
- Hosts needed: `api.steampowered.com`, the `file_url` host from `GetPublishedFileDetails` (Steam UGC CDN), plus image hosts for `--check-images`.

## Output per mod

`tier` (`none` < `A` < `B` < `C`, `D` = out of scope), `checks` (the tier-A conditions), `projection` (B/C reachable once the planned translator/shim exist), `objects` (converted / degraded / dropped per TTS type), `guidCollisions`, `decks` (cards vs. `DeckIDs`), `seats`, `images` (scheme count, per-host URLs, statuses), `scripts` (Global/object/`XmlUI`, bytes, Lua calls and events via `luaparse`, `buttons` = setup buttons found / translated into routines by the importer's Lua translator, #704). Aggregate: mods per tier, `buttons` (corpus total, translated, `ratio` — the slice 8 acceptance metric, ≥ 0.5), top-N calls and events by mod count.

## Tier rules (`analyze.mjs`)

- **A**: parse succeeds, every deck holds all `DeckIDs`, no GUID collisions, hand seats < `maxPlayers`, all image URLs https (and reachable with `--check-images`).
- **B**: tier A, scripts present, every Lua call in the translator set (`IMPLEMENTED.translatable`, slice 8 / #704) and every setup button translated.
- **C**: additionally every call and event in the Lua shim — raise `IMPLEMENTED.shim` in `analyze.mjs` with slice 9. Until then no mod reaches C.
- **D**: `Custom_Assetbundle` objects or `WebRequest.*` calls.

**Regression gate:** every tabletop import PR attaches the before/after `aggregate.perTier`; no mod may lower its tier (`--baseline`).
