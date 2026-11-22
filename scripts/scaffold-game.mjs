#!/usr/bin/env node
/**
 * Game scaffolder for LocalGameGalaxy.
 *
 * Produces the layout the existing games use (see docs/tech/game-catalog.md):
 *   src/games/<id>/index.ts                       registers the strings, named export of the entry component
 *   src/games/<id>/i18n/{de,en}.json, index.ts    the game's own strings (ADR-0011 §7)
 *   src/games/<id>/<Pascal>Game.tsx               entry component (usePageTitle + t())
 *   src/games/<id>/hooks/use<Pascal>State.ts      state hook persisted via lib/storage
 *   src/games/<id>/logic/types.ts                 domain types
 *   src/games/<id>/logic/<camel>Engine.ts         pure game rules
 *   src/games/<id>/logic/<camel>Engine.test.ts    Vitest tests for the rules
 *   src/games/<id>/definition.tsx                 catalogue entry (ADR-0011)
 * and patches by text insertion:
 *   src/lib/storage.ts                            STORAGE_KEYS.<ID>_GAME_STATE
 *   src/lib/catalog/entries.ts                    import + `ROUTE_GAMES` line
 *   public/locales/{de,en}/translation.json       games.<id>.title / description (the hub needs them)
 *
 * Usage:
 *   node scripts/scaffold-game.mjs --id=<id> --title="<DE title>" [--title-en="<EN title>"]
 *     [--description="<DE>"] [--description-en="<EN>"] [--area=<area>] [--modes=<m1,m2>] [--icon=<MuiIconName>]
 *     [--dry-run]
 *
 * `--icon` is the MUI icon base name without suffix (`@mui/icons-material/<Name>Rounded`).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const AREAS = ['party', 'music', 'cards', 'dice', 'puzzle'];
const MODES = ['solo', 'pass_and_play', 'party_room', 'async'];

const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const eq = arg.indexOf('=');
    if (eq === -1) acc[arg.slice(2)] = true;
    else acc[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return acc;
}, {});

const usage =
  'Usage: node scripts/scaffold-game.mjs --id=<id> --title="<DE title>" [--title-en=...] ' +
  '[--description=...] [--description-en=...] [--area=<area>] [--modes=<m1,m2>] [--icon=<MuiIcon>] [--dry-run]';

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const gameId = args.id;
const titleDe = args.title;
if (typeof gameId !== 'string' || typeof titleDe !== 'string' || !titleDe) {
  console.error(usage);
  fail('missing mandatory arguments --id and --title.');
}
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(gameId)) {
  fail(
    'game id must be lower-case alphanumeric with single dashes (e.g. "yatzy" or "battle-ship").',
  );
}
const area = typeof args.area === 'string' ? args.area : 'party';
if (!AREAS.includes(area)) fail(`area must be one of: ${AREAS.join(', ')}.`);
const modes = (typeof args.modes === 'string' ? args.modes : 'pass_and_play').split(',');
if (modes.some((m) => !MODES.includes(m))) fail(`modes must be from: ${MODES.join(', ')}.`);
if (modes.includes('party_room')) {
  fail('party_room needs a PartyGameType and a room route; add it by hand after scaffolding.');
}
const iconName = typeof args.icon === 'string' ? args.icon : 'SportsEsports';
if (!/^[A-Z][A-Za-z0-9]*$/.test(iconName)) fail('--icon must be a PascalCase MUI icon name.');
const dryRun = args['dry-run'] === true;

const titleEn = typeof args['title-en'] === 'string' ? args['title-en'] : titleDe;
const descriptionDe =
  typeof args.description === 'string' ? args.description : `TODO: Beschreibung für ${titleDe}.`;
const descriptionEn =
  typeof args['description-en'] === 'string'
    ? args['description-en']
    : `TODO: description for ${titleEn}.`;

const pascal = gameId
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('');
const i18nId = gameId.replace(/-/g, '_'); // locale keys use underscores (games.melodiq_notes)
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
const storageKeyName = `${gameId.toUpperCase().replace(/-/g, '_')}_GAME_STATE`;
const storageKeyValue = `${gameId.replace(/-/g, '_')}_game_state`;

const rel = (p) => path.relative(ROOT_DIR, p).split(path.sep).join('/');
const targetDir = path.join(ROOT_DIR, 'src', 'games', gameId);
const entriesPath = path.join(ROOT_DIR, 'src', 'lib', 'catalog', 'entries.ts');
const storagePath = path.join(ROOT_DIR, 'src', 'lib', 'storage.ts');
const localePaths = {
  de: path.join(ROOT_DIR, 'public', 'locales', 'de', 'translation.json'),
  en: path.join(ROOT_DIR, 'public', 'locales', 'en', 'translation.json'),
};

if (fs.existsSync(targetDir)) fail(`${rel(targetDir)} already exists.`);

// ---------------------------------------------------------------- file contents

const files = {};

files['logic/types.ts'] = `export type ${pascal}Phase = 'setup' | 'playing' | 'game_over';

export interface ${pascal}Player {
  id: string;
  name: string;
  score: number;
}

export interface ${pascal}State {
  phase: ${pascal}Phase;
  players: ${pascal}Player[];
  activePlayerIndex: number;
  round: number;
}
`;

files[`logic/${camel}Engine.ts`] = `import type { ${pascal}State } from './types';

export function createInitialState(): ${pascal}State {
  return { phase: 'setup', players: [], activePlayerIndex: 0, round: 1 };
}

export function startGame(state: ${pascal}State): ${pascal}State {
  return { ...state, phase: 'playing', activePlayerIndex: 0, round: 1 };
}

/** Advances to the next player; a full lap over all players starts the next round. */
export function nextTurn(state: ${pascal}State): ${pascal}State {
  const count = Math.max(state.players.length, 1);
  const next = state.activePlayerIndex + 1;
  return next >= count
    ? { ...state, activePlayerIndex: 0, round: state.round + 1 }
    : { ...state, activePlayerIndex: next };
}
`;

files[`logic/${camel}Engine.test.ts`] = `import { describe, it, expect } from 'vitest';
import { createInitialState, nextTurn, startGame } from './${camel}Engine';

describe('${pascal} engine', () => {
  it('starts in setup at round 1', () => {
    const state = createInitialState();
    expect(state.phase).toBe('setup');
    expect(state.round).toBe(1);
  });

  it('startGame switches to playing', () => {
    expect(startGame(createInitialState()).phase).toBe('playing');
  });

  it('nextTurn starts a new round after the last player', () => {
    const base = {
      ...createInitialState(),
      players: [
        { id: 'a', name: 'A', score: 0 },
        { id: 'b', name: 'B', score: 0 },
      ],
    };
    const second = nextTurn(base);
    expect(second.activePlayerIndex).toBe(1);
    expect(second.round).toBe(1);
    const wrapped = nextTurn(second);
    expect(wrapped.activePlayerIndex).toBe(0);
    expect(wrapped.round).toBe(2);
  });
});
`;

files[`hooks/use${pascal}State.ts`] = `import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { createInitialState, nextTurn, startGame } from '../logic/${camel}Engine';
import type { ${pascal}State } from '../logic/types';

const STORAGE_KEY = STORAGE_KEYS.${storageKeyName};

export function use${pascal}State() {
  const [state, setState] = useState<${pascal}State>(() =>
    storage.getJson<${pascal}State>(STORAGE_KEY, createInitialState()),
  );

  const update = useCallback((fn: (prev: ${pascal}State) => ${pascal}State) => {
    setState((prev) => {
      const next = fn(prev);
      storage.setJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const start = useCallback(() => update(startGame), [update]);
  const advance = useCallback(() => update(nextTurn), [update]);
  const reset = useCallback(() => update(createInitialState), [update]);

  return { state, start, advance, reset };
}
`;

files[`${pascal}Game.tsx`] =
  `import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/LayoutContext';
import { use${pascal}State } from './hooks/use${pascal}State';

export function ${pascal}Game() {
  const { t } = useTranslation();
  usePageTitle(t('games.${i18nId}.title'));
  const { state, start, advance, reset } = use${pascal}State();

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('games.${i18nId}.description')}
        </Typography>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {t('games.${i18nId}.round', { round: state.round })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {state.phase === 'setup' ? (
            <Button variant="contained" onClick={start}>
              {t('games.${i18nId}.start')}
            </Button>
          ) : (
            <>
              <Button variant="contained" onClick={advance}>
                {t('games.${i18nId}.next_turn')}
              </Button>
              <Button variant="outlined" onClick={reset}>
                {t('games.${i18nId}.restart')}
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
`;

files['index.ts'] = `import { init${pascal}I18n } from './i18n';

// Every route of ${titleEn} loads through this barrel; its strings must be registered first.
init${pascal}I18n();

export { ${pascal}Game } from './${pascal}Game';
`;

files['i18n/index.ts'] = `import { registerGameBundle } from '../../../lib/i18n/gameBundle';
import de from './de.json';
import en from './en.json';

const bundle = { de, en };

/** Registers ${titleEn}'s own strings (\`./de.json\`, \`./en.json\`); safe to call more than once. */
export const init${pascal}I18n = (): void => registerGameBundle(bundle);
`;

// ---------------------------------------------------------------- text patches

/** Returns the new content; throws if the anchor is missing or ambiguous. */
function insertOnce(content, anchor, replacement, label) {
  const first = content.indexOf(anchor);
  if (first === -1 || content.indexOf(anchor, first + 1) !== -1) {
    fail(
      `${label}: anchor not found exactly once (file layout changed?): ${JSON.stringify(anchor)}`,
    );
  }
  return content.replace(anchor, () => replacement);
}

const patches = []; // { file, content }

// storage.ts: register the key (no unregistered keys, see Q8).
{
  let c = fs.readFileSync(storagePath, 'utf8');
  if (c.includes(`${storageKeyName}:`)) fail(`STORAGE_KEYS.${storageKeyName} already exists.`);
  c = insertOnce(
    c,
    "  DARTS_GAME_STATE: 'darts_game_state',\n",
    `  DARTS_GAME_STATE: 'darts_game_state',\n  ${storageKeyName}: '${storageKeyValue}',\n`,
    'storage.ts',
  );
  patches.push({ file: storagePath, content: c });
}

// definition.tsx: the catalogue entry; entries.ts: collect it (ADR-0011).
files['definition.tsx'] = `/**
 * Catalogue entry of ${titleEn} (ADR-0011) [ID: CATALOG-${gameId.toUpperCase()}]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import ${iconName}Icon from '@mui/icons-material/${iconName}Rounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), '${pascal}Game');

export const definition = defineGame({
  id: '${gameId}',
  route: 'games/${gameId}',
  i18n: 'games.${i18nId}',
  title: ${JSON.stringify(titleDe)},
  kind: 'game',
  area: '${area}',
  modes: [${modes.map((m) => `'${m}'`).join(', ')}],
  listing: 'hub',
  icon: <${iconName}Icon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
`;
{
  let c = fs.readFileSync(entriesPath, 'utf8');
  if (c.includes(`games/${gameId}/definition'`)) fail(`${gameId} is already in entries.ts.`);
  c = insertOnce(
    c,
    "import { TABLETOP_ENTRIES } from '../../games/tabletop/catalog';\n",
    `import { definition as ${camel} } from '../../games/${gameId}/definition';\nimport { TABLETOP_ENTRIES } from '../../games/tabletop/catalog';\n`,
    'entries.ts import',
  );
  c = insertOnce(
    c,
    '];\n\n/** Every entry:',
    `  ${camel},\n];\n\n/** Every entry:`,
    'entries.ts ROUTE_GAMES line',
  );
  patches.push({ file: entriesPath, content: c });
}

// Strings: hub title/description in public/locales, the component's UI strings in the game bundle.
const hubStrings = {
  de: { title: titleDe, description: descriptionDe },
  en: { title: titleEn, description: descriptionEn },
};
const uiStrings = {
  de: {
    round: 'Runde {{round}}',
    start: 'Spiel starten',
    next_turn: 'Nächster Zug',
    restart: 'Neu starten',
  },
  en: { round: 'Round {{round}}', start: 'Start game', next_turn: 'Next turn', restart: 'Restart' },
};
for (const lang of ['de', 'en']) {
  files[`i18n/${lang}.json`] =
    `${JSON.stringify({ games: { [i18nId]: uiStrings[lang] } }, null, 2)}\n`;
}
for (const [lang, file] of Object.entries(localePaths)) {
  let c = fs.readFileSync(file, 'utf8');
  if (new RegExp(`^ {4}"${i18nId}": \\{`, 'm').test(c)) {
    fail(`games.${i18nId} already exists in ${rel(file)}.`);
  }
  const body = Object.entries(hubStrings[lang])
    .map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n');
  c = insertOnce(
    c,
    '\n  "games": {\n',
    `\n  "games": {\n    "${i18nId}": {\n${body}\n    },\n`,
    rel(file),
  );
  JSON.parse(c); // must stay valid JSON
  patches.push({ file, content: c });
}

// ---------------------------------------------------------------- write

const created = Object.keys(files).map((f) => `src/games/${gameId}/${f}`);
const modified = patches.map((p) => rel(p.file));

if (dryRun) {
  console.log(`[dry-run] would create:\n${created.map((f) => `  ${f}`).join('\n')}`);
  console.log(`[dry-run] would modify:\n${modified.map((f) => `  ${f}`).join('\n')}`);
  process.exit(0);
}

for (const [rf, content] of Object.entries(files)) {
  const full = path.join(targetDir, rf);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}
for (const { file, content } of patches) fs.writeFileSync(file, content);

console.log(`Scaffolded ${titleEn} (${gameId}), area ${area}.`);
console.log(`Created:\n${created.map((f) => `  ${f}`).join('\n')}`);
console.log(`Modified:\n${modified.map((f) => `  ${f}`).join('\n')}`);
console.log(
  'Next: replace the placeholder logic/UI, review the TODO description, add the id to the hub list in src/lib/catalog/catalog.test.ts, add the game to docs/tech/game-catalog.md and a changelog.d fragment.',
);
