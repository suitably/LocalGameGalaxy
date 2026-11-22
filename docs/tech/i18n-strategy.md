---
type: Reference
title: 'i18n strategy (de/en)'
description: 'How translations are loaded (i18next HTTP backend for the shell + per-game JSON bundles registered with registerGameBundle), where a string must be added, the 17 top-level namespaces, interpolation/plural conventions, and the parity ratchet in the hygiene check.'
tags: [i18n, localization, react-i18next, translation]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-11-22
  method: '2026-11-22: per-game JSON bundles via src/lib/i18n/gameBundle.ts (ADR-0011 §7), parity check over them; read src/i18n.ts, src/games/*/i18n/index.ts, public/locales/*/translation.json top-level keys, scripts/check-repo-hygiene.mjs (parity check); 2026-11-16: Sudoku and Wordle bundle status re-checked with grep'
sources:
  - 'src/i18n.ts'
  - 'public/locales/'
  - 'scripts/check-repo-hygiene.mjs'
  - 'merged from: previous version of 2026-09-27'
---

# i18n Strategy & Translation Namespace Architecture

> [!IMPORTANT]
> All user-facing strings MUST be localized. Never hardcode text in components. Always add keys to **both** `en/translation.json` and `de/translation.json` simultaneously.

---

## 1. Technology Stack

| Component         | Library                       |
| ----------------- | ----------------------------- |
| Core i18n engine  | `i18next` v25                 |
| React integration | `react-i18next` v16           |
| Backend loader    | `i18next-http-backend` v4     |
| Supported locales | `en` (English), `de` (German) |

---

## 2. Initialization (`src/i18n.ts`)

- Initial language: `storage.get(STORAGE_KEYS.LANGUAGE)` (`lgg_language`), then the legacy key `language`, then `navigator.language` (`de*` → `de`, else `en`). Changes are written back to both keys.
- `i18next-http-backend` loads `/locales/{{lng}}/{{ns}}.json`; `fallbackLng: 'en'`, `preload: ['en', 'de']`, default namespace `translation`, `useSuspense: false`.

## 3. Where strings live (ADR-0011 §7)

| Source                                    | Holds                                                                                                                      | How it is loaded                                                                                                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/locales/{en,de}/translation.json` | app shell, hub, settings, party, connection, notifications, shared modules, every game's `games.<id>.title`/`.description` | HTTP backend at start-up                                                                                                                                                                                                    |
| `src/games/<id>/i18n/{de,en}.json`        | everything else of that game, under the same key paths `t()` uses                                                          | `src/games/<id>/i18n/index.ts` exports `init<Game>I18n()`, which calls `registerGameBundle` (`src/lib/i18n/gameBundle.ts`: deep merge into `translation` once i18next is initialised); called from the game's entry modules |

Games on per-game bundles so far: cards, darts, drawpot, garticphone, guessart, imposter, kniffel, knister, melodiq, melodiq-notes, qwixx, storyteller, sudoku, tabletop, werewolf, wordle (migration status: [GAME-CATALOG-RESTRUCTURE §7](../tasks/GAME-CATALOG-RESTRUCTURE.md#7-progress)). Games not yet migrated keep their strings in `public/locales`; add a string where its game keeps its strings today.

`init<Game>I18n()` must run before the game renders: call it at module level in the game's barrel (`index.ts`, which the catalogue's `lazy()` page loads) or in the page components it exports, and in any module outside the game folder that imports the game's components directly.

## 4. Namespaces in `translation.json`

Top-level keys (identical in `en` and `de`): `app`, `common`, `connection`, `games`, `gartic`, `github`, `guessart`, `hub`, `lobby`, `notifications`, `party`, `server`, `settings`, `signaling`, `storyteller`, `sudoku`, `wordle`. Game titles/descriptions for the hub are under `games.<id>.title` / `.description` (the keys referenced by `gameRegistry.tsx`).

### Example

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('games.werewolf.title')}</h1>;
}
```

### Parity gate

`npm run check:hygiene` (pre-commit and CI) flattens both `public/locales` files and every `src/games/<id>/i18n/{de,en}.json` pair and fails on **new** keys missing in either language; known gaps are listed in `scripts/i18n-parity-baseline.json` (currently empty) and must be removed from it when fixed.

## 5. Adding new translation keys

1. Find where the surrounding component's strings live (§3).
2. Add the key to **both** `en` and `de` in that place (`public/locales/*/translation.json`, or the game's `i18n/de.json` and `i18n/en.json`).
3. Use it via `t('namespace.key')`. A default value as second argument (`t('connection.party_id', 'Party ID')`) is used in a few places as fallback; it does not replace the entries.
4. Run `npm run check:hygiene` for the parity check.

New game: the hub renders `games.<id>.title` / `.description` before any game bundle is initialised, so these two keys always go into `public/locales/*/translation.json`, never into the game's bundle.

## 6. Interpolation and Pluralization

Variables are injected using double-brace syntax:

```tsx
// Key: "pass_device_instruction": "Pass device to {{name}}"
t('games.werewolf.pass_device_instruction', { name: player.name });
```

Plural forms use the `_one` / `_other` suffix convention supported by i18next:

```json
"player_count_one": "{{count}} Player",
"player_count_other": "{{count}} Players"
```
