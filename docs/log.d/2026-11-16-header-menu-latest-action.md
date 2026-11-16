## 2026-11-16 — Header menu items run their latest action (agent)

- `docs/tech/architecture.md` §3.4: header contract — `setMenuItems` compares what the header shows (label, icon type/key/primitive props, `disabled`, `showAlways`) and always runs the latest action (`src/context/headerMenuItems.ts`); `setCustomHeaderActions` / `setHomeAction` always replace.
- `docs/tech/tabletop-engine.md`: the action ref in `useTabletopHeader.tsx` is no longer required.
- Code outside `docs/` changed: `src/context` (header menu fix + tests), shell a11y labels and i18n in `src/components`, `src/features`, `src/modules`, `public/locales/{de,en}`, settings text column width, `App.tsx` loading fallback height.
