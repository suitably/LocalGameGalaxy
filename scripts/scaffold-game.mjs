#!/usr/bin/env node
/**
 * Game Scaffolding Tool for LocalGameGalaxy
 * 
 * Enforces the Single Source of Truth architecture and prevents AI agent semantic drift.
 * Usage:
 *   node scripts/scaffold-game.mjs --id=<gameId> --title="<Game Title>" [--category=<category>] [--icon=<icon>]
 *
 * Example:
 *   node scripts/scaffold-game.mjs --id=battleship --title="Schiffe versenken" --category=party
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    acc[key] = val || true;
  }
  return acc;
}, {});

const gameId = args.id;
const gameTitle = args.title;
const category = args.category || 'party';
const iconName = args.icon || 'SportsEsports';

if (!gameId || !gameTitle) {
  console.error('❌ Error: Missing mandatory arguments.');
  console.log('Usage: node scripts/scaffold-game.mjs --id=<id> --title="<Title>" [--category=<cat>]');
  process.exit(1);
}

// Sanitize gameId
if (!/^[a-z0-9-]+$/.test(gameId)) {
  console.error('❌ Error: game id must be lower-case alphanumeric with dashes (e.g. "yatzy" or "battleship").');
  process.exit(1);
}

const capitalized = gameId
  .split('-')
  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');

const targetDir = path.join(ROOT_DIR, 'src', 'games', gameId);
if (fs.existsSync(targetDir)) {
  console.error(`❌ Error: Game directory ${targetDir} already exists.`);
  process.exit(1);
}

console.log(`🚀 Scaffolding new game: ${gameTitle} (${gameId}) in category [${category}]...`);

// 1. Create directories
fs.mkdirSync(path.join(targetDir, 'hooks'), { recursive: true });
fs.mkdirSync(path.join(targetDir, 'components'), { recursive: true });
fs.mkdirSync(path.join(targetDir, 'tests'), { recursive: true });

// 2. types.ts
const typesContent = `export type ${capitalized}Phase = 'setup' | 'playing' | 'round_over' | 'game_over';

export interface ${capitalized}Player {
  id: string;
  name: string;
  score: number;
}

export interface ${capitalized}State {
  phase: ${capitalized}Phase;
  players: ${capitalized}Player[];
  activePlayerIndex: number;
  round: number;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 3. hooks/use<Game>State.ts
const hookContent = `import { useState, useCallback } from 'react';
import { storage } from '../../../lib/storage';
import type { ${capitalized}State, ${capitalized}Phase } from '../types';

const STORAGE_KEY = \`${gameId}_game_state\` as any;

const initialState: ${capitalized}State = {
  phase: 'setup',
  players: [],
  activePlayerIndex: 0,
  round: 1,
};

export function use${capitalized}State() {
  const [state, setState] = useState<${capitalized}State>(() => {
    return storage.getJSON<${capitalized}State>(STORAGE_KEY, initialState);
  });

  const setPhase = useCallback((phase: ${capitalized}Phase) => {
    setState(prev => {
      const next = { ...prev, phase };
      storage.setJSON(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    storage.setJSON(STORAGE_KEY, initialState);
    setState(initialState);
  }, []);

  return {
    state,
    setPhase,
    resetGame,
  };
}
`;
fs.writeFileSync(path.join(targetDir, 'hooks', `use${capitalized}State.ts`), hookContent);

// 4. <Game>Game.tsx (<150 lines, compliant with budget)
const gameComponentContent = `import React from 'react';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { use${capitalized}State } from './hooks/use${capitalized}State';

export const ${capitalized}Game: React.FC = () => {
  const { t } = useTranslation();
  const { state, setPhase, resetGame } = use${capitalized}State();

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          {t('games.${gameId}.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('games.${gameId}.description')}
        </Typography>

        <Box sx={{ my: 3 }}>
          <Typography variant="h6">
            Status: <strong>{state.phase}</strong> | Runde: <strong>{state.round}</strong>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {state.phase === 'setup' ? (
            <Button variant="contained" color="primary" onClick={() => setPhase('playing')}>
              Spiel starten
            </Button>
          ) : (
            <Button variant="outlined" color="secondary" onClick={resetGame}>
              Neu starten
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};
`;
fs.writeFileSync(path.join(targetDir, `${capitalized}Game.tsx`), gameComponentContent);

// 5. gameManifest.ts
const manifestContent = `export interface GameManifest {
  id: string;
  titleKey: string;
  descriptionKey: string;
  category: string;
  minPlayers: number;
  maxPlayers: number;
}

export const manifest: GameManifest = {
  id: '${gameId}',
  titleKey: 'games.${gameId}.title',
  descriptionKey: 'games.${gameId}.description',
  category: '${category}',
  minPlayers: 2,
  maxPlayers: 8,
};
`;
fs.writeFileSync(path.join(targetDir, 'gameManifest.ts'), manifestContent);

// 6. index.ts
const indexContent = `export { ${capitalized}Game } from './${capitalized}Game';
export { manifest } from './gameManifest';
export type * from './types';
`;
fs.writeFileSync(path.join(targetDir, 'index.ts'), indexContent);

// 7. tests/<id>.test.ts
const testContent = `import { describe, it, expect } from 'vitest';
import { manifest } from '../gameManifest';

describe('${capitalized} Game', () => {
  it('has valid manifest configuration', () => {
    expect(manifest.id).toBe('${gameId}');
    expect(manifest.titleKey).toBe('games.${gameId}.title');
    expect(manifest.minPlayers).toBeGreaterThanOrEqual(1);
    expect(manifest.maxPlayers).toBeGreaterThanOrEqual(manifest.minPlayers);
  });
});
`;
fs.writeFileSync(path.join(targetDir, 'tests', `${gameId}.test.ts`), testContent);

// 8. Register in i18n translation files
const dePath = path.join(ROOT_DIR, 'public', 'locales', 'de', 'translation.json');
const enPath = path.join(ROOT_DIR, 'public', 'locales', 'en', 'translation.json');

function addI18nKey(filePath, id, title) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!content.games) content.games = {};
  if (!content.games[id]) {
    content.games[id] = {
      title: title,
      description: title + ' Party- und Gesellschaftsspiel.',
    };
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`✔ Updated ${path.basename(filePath)}`);
  }
}

addI18nKey(dePath, gameId, gameTitle);
addI18nKey(enPath, gameId, gameTitle);

// 9. Update gameRegistry.tsx
const registryPath = path.join(ROOT_DIR, 'src', 'lib', 'gameRegistry.tsx');
let registryContent = fs.readFileSync(registryPath, 'utf8');

// Insert lazy import before class GameRegistry
const lazyImport = `const ${capitalized}Game = lazy(() => import('../games/${gameId}').then(m => ({ default: m.${capitalized}Game })));\n`;
if (!registryContent.includes(`${capitalized}Game = lazy`)) {
  registryContent = registryContent.replace(
    'class GameRegistry {',
    `${lazyImport}class GameRegistry {`
  );

  // Insert entry into games array
  const registryEntry = `        {
            id: '${gameId}',
            route: 'games/${gameId}',
            titleKey: 'games.${gameId}.title',
            descriptionKey: 'games.${gameId}.description',
            icon: <${iconName}Icon sx={{ fontSize: 72, mb: 2 }} />,
            colorStart: '#6366f1',
            colorEnd: '#4f46e5',
            hoverColor: '#4f46e5',
            category: '${category}' as any,
            component: <${capitalized}Game />
        },
`;
  registryContent = registryContent.replace(
    'private games: GameDefinition[] = [',
    `private games: GameDefinition[] = [\n${registryEntry}`
  );
  fs.writeFileSync(registryPath, registryContent);
  console.log(`✔ Registered in src/lib/gameRegistry.tsx`);
}

console.log(`\n🎉 Successfully scaffolded ${gameTitle}!`);
console.log(`📁 Files created in: src/games/${gameId}/`);
console.log(`   - gameManifest.ts`);
console.log(`   - types.ts`);
console.log(`   - hooks/use${capitalized}State.ts`);
console.log(`   - ${capitalized}Game.tsx`);
console.log(`   - tests/${gameId}.test.ts`);
console.log(`   - index.ts`);
