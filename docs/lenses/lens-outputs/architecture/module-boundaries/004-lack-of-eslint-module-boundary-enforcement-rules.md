---
title: "[LOW] Lack of ESLint Module Boundary Enforcement Rules"
severity: low
type: maintainability
domain: Architecture
lens: module-boundaries
labels:
  - "audit:architecture/module-boundaries"
---

## Summary
The project lacks any automated linter enforcement for module boundaries. While the repository uses ESLint 9 (flat configuration format), it does not include rules or plugins (such as `eslint-plugin-import-x` with `no-restricted-paths`, or `eslint-plugin-boundaries`) to prevent developers from making deep, cross-module, or circular imports.

## Impact
Without automated static analysis, developers can easily bypass module boundaries and public entry points. This leads to regression over time as new violations go undetected during code reviews, causing code coupling and architectural erosion.

## Evidence
In [eslint.config.js](file:///home/deck/Projects/LocalGameGalaxy/eslint.config.js):
- Lines 22-34:
```javascript
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': 'warn',
      'no-empty': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
    },
```
As shown, there are no import-related or boundary-related rules configured.

## Recommended Fix
1. Install `eslint-plugin-import-x` (which is a modern, ESLint 9 flat-config compatible fork of `eslint-plugin-import`) or `eslint-plugin-boundaries`:
```bash
npm install --save-dev eslint-plugin-import-x
```
2. Import and configure restricted import paths in [eslint.config.js](file:///home/deck/Projects/LocalGameGalaxy/eslint.config.js) to enforce that modules (e.g. `games/*`, `lib/webrtc`) are only accessed via their public entry points. For example:
```javascript
import importX from 'eslint-plugin-import-x'

export default defineConfig([
  // ...
  {
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-restricted-paths': ['error', {
        zones: [
          {
            target: './src/App.tsx',
            from: './src/games/melodiq/components/**/*',
            message: 'Do not import internal components from melodiq directly. Use the public API in src/games/melodiq/index.ts instead.'
          },
          {
            target: './src/games/melodiq/**/*',
            from: './src/lib/webrtc/!(index.ts)*',
            message: 'Do not import internal files from WebRTC. Use src/lib/webrtc/index.ts instead.'
          }
        ]
      }]
    }
  }
])
```

## References
- ESLint Flat Config documentation
- `eslint-plugin-import-x` documentation on `no-restricted-paths`

## Validation
- attacker_source — n/a
- missing_guard — n/a
- sink_effect — n/a
- preconditions — none
- proof_anchors — eslint.config.js:22-34
- suggested_validation — ! grep -E -q "import-x|boundaries|no-restricted-paths" /home/deck/Projects/LocalGameGalaxy/eslint.config.js
