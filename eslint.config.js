import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'android', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
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
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/games/melodiq/components/**', '**/games/melodiq/hooks/**'],
            message: 'Import from the public entry point "src/games/melodiq" instead of internal directories.'
          },
          {
            group: ['**/games/werewolf/components/**', '**/games/werewolf/hooks/**'],
            message: 'Import from the public entry point "src/games/werewolf" instead of internal directories.'
          },
          {
            group: ['**/games/imposter/components/**', '**/games/imposter/hooks/**'],
            message: 'Import from the public entry point "src/games/imposter" instead of internal directories.'
          },
          {
            group: ['**/games/guessart/components/**', '**/games/guessart/hooks/**'],
            message: 'Import from the public entry point "src/games/guessart" instead of internal directories.'
          },
          {
            group: ['**/lib/webrtc/*HostContext', '**/lib/webrtc/*HostManager', '**/lib/webrtc/useWebRTCClient'],
            message: 'Import from the public entry point "src/lib/webrtc" instead of internal files.'
          }
        ]
      }]
    },
  },
])
