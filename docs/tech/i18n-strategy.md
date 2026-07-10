# i18n Strategy & Translation Namespace Architecture [ID: TECH-I18N]

> [!IMPORTANT]
> All user-facing strings MUST be localized. Never hardcode text in components. Always add keys to **both** `en/translation.json` and `de/translation.json` simultaneously.

---

## 1. Technology Stack

| Component | Library |
|-----------|---------|
| Core i18n engine | `i18next` v25 |
| React integration | `react-i18next` v16 |
| Backend loader | `i18next-http-backend` v4 |
| Supported locales | `en` (English), `de` (German) |

---

## 2. Initialization

i18n is initialized in `src/i18n.ts`:
- Language is detected from `localStorage` key `lgg_language`, falling back to the browser's `navigator.language`.
- Translation files are loaded lazily via HTTP from `public/locales/<lang>/translation.json`.
- The default namespace is `translation`.

---

## 3. Directory Structure

```
public/
└── locales/
    ├── en/
    │   └── translation.json    ← English strings (source of truth)
    └── de/
        └── translation.json    ← German strings (must mirror en/ exactly)
```

> [!WARNING]
> Both locale files must always have **identical key structures**. Missing keys in one locale will cause raw key strings to render in the UI for that language.

---

## 4. Key Namespace Structure

The single `translation.json` file is divided into logical namespaces as top-level JSON keys:

```
translation.json
├── app.*              → Global app UI (title, navigation, welcome messages)
├── games.*            → Game-specific strings
│   ├── werewolf.*     → All Werewolf UI text (roles, phases, actions)
│   ├── melodiq.*      → All Melodiq UI text (queue, settings, scores)
│   └── imposter.*     → All Imposter UI text (setup, reveal, voting)
├── settings.*         → App and game settings panel strings
├── common.*           → Shared UI strings (buttons, errors, loading states)
└── feedback.*         → Feedback dialog strings
```

### Example Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('games.werewolf.title')}</h1>;
}
```

---

## 5. Adding New Translation Keys (Mandatory Steps)

When adding any new user-facing string:

1. **Add the key to `public/locales/en/translation.json`** under the correct namespace.
2. **Add the same key to `public/locales/de/translation.json`** with the German translation.
3. **Use the key in the component** via `t('namespace.key')`.
4. **Never commit** a PR that adds keys to one locale but not the other.

### Adding a New Game Module

If a new game is added, create a new top-level namespace key (e.g., `games.trivia.*`) and add all strings to both locale files before writing any UI component text.

---

## 6. Interpolation and Pluralization

Variables are injected using double-brace syntax:
```tsx
// Key: "pass_device_instruction": "Pass device to {{name}}"
t('games.werewolf.pass_device_instruction', { name: player.name })
```

Plural forms use the `_one` / `_other` suffix convention supported by i18next:
```json
"player_count_one": "{{count}} Player",
"player_count_other": "{{count}} Players"
```
