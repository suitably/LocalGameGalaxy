# Coding Conventions & Styling Guidelines [ID: TECH-CODING-CONVENTIONS]

This document establishes the styling, naming, and structural guidelines for TypeScript and React code in LocalGameGalaxy.

---

## 1. Naming Conventions

### Variables & Functions
- Use **camelCase** for variables, objects, functions, and custom hooks.
  ```typescript
  const activeSessionId = '123';
  function calculatePlayerScore() { ... }
  function useCustomHook() { ... }
  ```

### Types & Interfaces
- Use **PascalCase** for TypeScript interfaces, types, and classes.
- Prefer interfaces for objects and shapes, and types for unions, aliases, or intersections.
- Do NOT prefix interfaces with `I` (e.g. use `GameSession` instead of `IGameSession`).
  ```typescript
  interface PlayerProfile {
    id: string;
    username: string;
  }
  type RoleType = 'werewolf' | 'villager' | 'hunter';
  ```

### Components
- Use **PascalCase** for React components and filenames containing components.
  ```typescript
  // File: GlobalHeader.tsx
  export function GlobalHeader() { ... }
  ```

---

## 2. File Organization & Folder Layouts

For each game or feature module:
- Place UI-only components inside `components/` subfolder.
- Place custom hooks in `hooks/`.
- Keep pure business logic/reducers separate in `logic/` to ensure they are fully unit-testable.

---

## 3. Material UI (MUI) Styling Preferences

LocalGameGalaxy utilizes Material UI (MUI). To maintain styling consistency and readability:
- **Prefer inline styling via the `sx` prop** for small, layout-specific adjustments (paddings, margins, alignment).
- **Use `styled()` from `@mui/material/styles`** for complex, highly reusable components that need clean DOM elements.
- **Color Palettes**: Avoid hardcoding hex color codes directly. Always reference theme tokens (`theme.palette.primary.main`, `theme.palette.background.default`) to ensure dark/light mode compatibility.

---

## 4. Code Formatting Integration

All TypeScript/React files must be formatted with **Prettier** using the following rules defined in `.prettierrc`:
- Semicolons: Yes (`semi: true`)
- Quotes: Single (`singleQuote: true`)
- Tab width: 2 spaces (`tabWidth: 2`)
- Trailing commas: All (`trailingComma: all`)
- Print width: 100 characters (`printWidth: 100`)

To format the codebase:
```bash
npx prettier --write "src/**/*.{ts,tsx}"
```
