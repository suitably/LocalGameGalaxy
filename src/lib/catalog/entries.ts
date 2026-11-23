/**
 * Collects every catalogue entry; the only place that lists games (ADR-0011) [ID: LIB-CATALOG-ENTRIES]
 *
 * Order here is display order in the hub, the Spieltisch sections and the party picker.
 * Adding a game: create `src/games/<id>/definition.tsx` and add one line below.
 */
import { definition as darts } from '../../games/darts/definition';
import { definition as kniffel } from '../../games/kniffel/definition';
import { definition as knister } from '../../games/knister/definition';
import { definition as qwixx } from '../../games/qwixx/definition';
import { definition as garticphone } from '../../games/garticphone/definition';
import { definition as guessart } from '../../games/guessart/definition';
import { definition as storyteller } from '../../games/storyteller/definition';
import { definition as cards } from '../../games/cards/definition';
import { definition as melodiq } from '../../games/melodiq/definition';
import { definition as melodiqNotes } from '../../games/melodiq-notes/definition';
import { definition as werewolf } from '../../games/werewolf/definition';
import { definition as imposter } from '../../games/imposter/definition';
import { definition as party } from '../../features/party/definition';
import { definition as wordle } from '../../games/wordle/definition';
import { definition as sudoku } from '../../games/sudoku/definition';
import { definition as tabletop } from '../../games/tabletop/definition';
import { definition as drawpot } from '../../games/drawpot/definition';
import { TABLETOP_ENTRIES } from '../../games/tabletop/catalog';
import type { CatalogEntry, GameDefinition } from './types';

/** Entries with a page of their own (routes in `App.tsx`). */
export const ROUTE_GAMES: readonly GameDefinition[] = [
  darts,
  kniffel,
  knister,
  qwixx,
  garticphone,
  guessart,
  storyteller,
  cards,
  melodiq,
  melodiqNotes,
  werewolf,
  imposter,
  party,
  wordle,
  sudoku,
  tabletop,
  drawpot,
];

/** Every entry: route games first, then Spieltisch presets and rule scripts. */
export const CATALOG: readonly CatalogEntry[] = [...ROUTE_GAMES, ...TABLETOP_ENTRIES];
