import { afterAll, describe, expect, it, vi } from 'vitest';
import deLocale from '../../../public/locales/de/translation.json';
import enLocale from '../../../public/locales/en/translation.json';
import type { PartyGameType } from '../../features/party/logic/universalPartyManager';

// Melodiq reads `window.location` at import time; the node test environment has no window.
vi.stubGlobal('window', { location: { search: '' } });

const load = async () => ({
  ...(await import('./entries')),
  ...(await import('./views')),
  ...(await import('../../games/tabletop/scripted/logic/scriptRegistry')),
  ...(await import('../../features/party/logic/partyRoutes')),
});

const LOCALES = [deLocale, enLocale] as Record<string, unknown>[];
/** Sources of the per-game bundles (`src/games/<id>/i18n/index.ts`). */
const BUNDLES = import.meta.glob<string>('../../games/*/i18n/index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const lookup = (tree: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], tree);

/** A key is translated in both public locales, or the game's own bundle names it. */
function translated(key: string): boolean {
  if (LOCALES.every((tree) => typeof lookup(tree, key) === 'string')) return true;
  const [, gameId, ...rest] = key.split('.');
  const bundle = BUNDLES[`../../games/${gameId}/i18n/index.ts`];
  return bundle !== undefined && bundle.includes(`${rest.at(-1)}:`);
}

describe('game catalogue', { timeout: 30000 }, () => {
  afterAll(() => vi.unstubAllGlobals());

  it('has unique ids and translated titles and descriptions', async () => {
    const { CATALOG } = await load();
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of CATALOG) {
      expect(translated(e.titleKey), e.titleKey).toBe(true);
      expect(translated(e.descKey), e.descKey).toBe(true);
      if (e.party?.descKey) expect(translated(e.party.descKey), e.party.descKey).toBe(true);
      expect(e.modes.length, e.id).toBeGreaterThan(0);
    }
  });

  it('gives every party game type exactly one way to start', async () => {
    const { CATALOG, launchablePartyTypes } = await load();
    // Record forces this list to name every PartyGameType.
    const types: Record<PartyGameType, true> = {
      guessart: true,
      garticphone: true,
      storyteller: true,
      'melodiq-notes': true,
      melodiq: true,
      tabletop: true,
      imposter: true,
      werewolf: true,
      knister: true,
      kniffel: true,
      qwixx: true,
    };
    const routeTypes = launchablePartyTypes();
    expect(new Set(routeTypes).size).toBe(routeTypes.length);
    expect([...routeTypes, 'tabletop'].sort()).toEqual(Object.keys(types).sort());
    for (const e of CATALOG) {
      if (e.modes.includes('party_room') && e.kind !== 'place') expect(e.party, e.id).toBeDefined();
      if (e.launch.type === 'tabletop') expect(e.party?.gameType, e.id).toBe('tabletop');
    }
  });

  it('keeps the room dice games and the rule scripts in step with the catalogue', async () => {
    const { entriesIn, ROOM_DICE_GAMES, isScriptedGame } = await load();
    const dice = entriesIn('dice').filter((e) => e.modes.includes('party_room'));
    expect(dice.map((e) => e.id).sort()).toEqual([...ROOM_DICE_GAMES].sort());
    for (const e of entriesIn('cards')) expect(isScriptedGame(e.id), e.id).toBe(true);
  });

  // Characterisation (phase 0 of docs/tasks/GAME-CATALOG-RESTRUCTURE.md): what each screen
  // lists. Change these only together with an intended change of the screen.
  it('lists the hub tiles: every game, places last; tools apart', async () => {
    const { hubGames, hubTools } = await load();
    expect(hubGames().map((e) => e.id)).toEqual([
      'kniffel',
      'knister',
      'qwixx',
      'garticphone',
      'guessart',
      'storyteller',
      'melodiq',
      'melodiq-notes',
      'werewolf',
      'imposter',
      'wordle',
      'sudoku',
      'standard-cards',
      'liars-dice',
      'checkers',
      'schwimmen',
      'durak',
      'arschloch',
      'skat',
      'maumau',
      'schwarzer-peter',
      'golf',
      'cabo',
      'tabletop',
    ]);
    expect(hubTools().map((e) => e.id)).toEqual(['darts', 'cards', 'drawpot']);
  });

  it('lists the Spieltisch sections', async () => {
    const { entriesIn } = await load();
    const ids = (s: Parameters<typeof entriesIn>[0]) => entriesIn(s).map((e) => e.id);
    expect(ids('starters')).toEqual(['standard-cards', 'liars-dice', 'checkers']);
    expect(ids('cards')).toEqual([
      'schwimmen',
      'durak',
      'arschloch',
      'skat',
      'maumau',
      'schwarzer-peter',
      'golf',
      'cabo',
    ]);
    expect(ids('dice')).toEqual(['kniffel', 'knister', 'qwixx']);
    expect(ids('trackers')).toEqual(['cards']);
    expect(ids('hidden')).toEqual(['party']);
  });

  it('lists the party picker tabs', async () => {
    const { partyPickerEntries } = await load();
    expect(partyPickerEntries('party').map((e) => e.id)).toEqual([
      'garticphone',
      'guessart',
      'storyteller',
      'melodiq',
      'melodiq-notes',
      'werewolf',
      'imposter',
    ]);
    expect(partyPickerEntries('table').map((e) => e.id)).toEqual([
      'standard-cards',
      'liars-dice',
      'checkers',
      'schwimmen',
      'durak',
      'arschloch',
      'skat',
      'maumau',
      'schwarzer-peter',
      'golf',
      'cabo',
      'kniffel',
      'knister',
      'qwixx',
    ]);
  });

  it('resolves every page and party link', async () => {
    const { ROUTE_GAMES, resolvePendingLaunch } = await load();
    expect(ROUTE_GAMES.map((g) => g.route)).toContain('games/garticphone');
    for (const type of ['guessart', 'garticphone', 'melodiq', 'kniffel', 'werewolf']) {
      expect(resolvePendingLaunch(new URLSearchParams(`launch=${type}`))).toEqual({
        gameType: type,
      });
    }
    expect(resolvePendingLaunch(new URLSearchParams('launch=tabletop&gameId=skat'))).toEqual({
      gameType: 'tabletop',
      gameId: 'skat',
    });
    expect(resolvePendingLaunch(new URLSearchParams('launch=wordle'))).toBeNull();
  });
});
