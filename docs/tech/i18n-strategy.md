---
type: Reference
title: 'i18n strategy (de/en)'
description: 'How translations are loaded (i18next HTTP backend + per-game resource bundles), where a string must be added, the 17 top-level namespaces, interpolation/plural conventions, and the parity ratchet in the hygiene check.'
tags: [i18n, localization, react-i18next, translation]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'read src/i18n.ts, src/games/*/i18n/index.ts, public/locales/*/translation.json top-level keys, scripts/check-repo-hygiene.mjs (parity check)'
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

## 3. Two places where strings live

| Source                                    | Who uses it                                                                                                                                                      | How it is loaded                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/locales/{en,de}/translation.json` | app shell, hub, settings, party, connection, notifications, and the games darts, guessart, storyteller, melodiq-notes, werewolf, imposter, tabletop, garticphone | HTTP backend at start-up                                                                                                                          |
| `src/games/<id>/i18n/index.ts`            | cards, kniffel, knister, melodiq, qwixx, sudoku, wordle                                                                                                          | the game calls its `init<Game>I18n()` which runs `i18next.addResourceBundle(lang, 'translation', …, deep=true, overwrite=true)` for `en` and `de` |

Rule: add a string **where its game already keeps its strings**, in both languages. Do not move a game between the two systems as a side effect.

`src/i18n/locales/{de,en}/imposter.json` exist but are imported nowhere ([open-questions Q6](../open-questions.md#q6--dead-translation-files)).

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

`npm run check:hygiene` (pre-commit and CI) flattens both `public/locales` files and fails on **new** keys missing in either language; known gaps are listed in `scripts/i18n-parity-baseline.json` (currently empty) and must be removed from it when fixed. Per-game bundles in `src/games/*/i18n/` are **not** covered by this check.

## 5. Adding new translation keys

1. Find where the surrounding component's strings live (§3).
2. Add the key to **both** `en` and `de` in that place (`public/locales/*/translation.json`, or both objects of the game's `i18n/index.ts`).
3. Use it via `t('namespace.key')`. A default value as second argument (`t('connection.party_id', 'Party ID')`) is used in a few places as fallback; it does not replace the entries.
4. Run `npm run check:hygiene` for the `public/locales` parity check.

New game: the hub renders `games.<id>.title` / `.description` before any game bundle is initialised, so these two keys always go into `public/locales/*/translation.json` — also for games that keep the rest of their strings in a bundle (qwixx, cards, kniffel do this).

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
